import { db } from "@/lib/db";
import { logger, describeError } from "@/lib/logger";
import { processAndStoreImage } from "@/lib/images";
import { bestRosterMatch, looksLikeSameTeam } from "@/lib/premier-core";
import { getPremierTeam, estQuotaDepasse } from "@/lib/henrikdev";
import type { PremierTeamEntry } from "@/lib/validation/premier";

/**
 * Rattachement des équipes du miroir Premier.
 *
 * Extrait de `premier.ts`, qui dépassait les 800 lignes que le dépôt se fixe.
 * C'est la partie la plus délicate du miroir — décider qu'une équipe du
 * classement Riot EST une équipe déjà présente sur le site, ou qu'il faut en
 * créer une — et elle gagne à se lire seule.
 *
 * Comme le reste de `src/lib/data/**`, ce module touche Prisma et sort donc du
 * périmètre de couverture. Les décisions pures (ressemblance de nom,
 * appariement de roster) vivent dans `premier-core.ts` et y sont testées.
 */

export type TeamSyncResult = {
  created: number;
  linked: number;
  /** Rattachées à une fiche déjà présente sur le site, par leur roster. */
  rosterLinked: number;
  /** Créées malgré une ressemblance avec une fiche existante : à arbitrer. */
  suspects: string[];
  byPremierId: Map<string, string>;
};

/** Équipes du site non encore rattachées, avec les puuid de leur roster actif. */
async function candidatesARattacher(): Promise<
  { teamId: string; name: string; tag: string; puuids: string[] }[]
> {
  const teams = await db.team.findMany({
    where: { premierTeamId: null },
    select: {
      id: true,
      name: true,
      tag: true,
      memberships: {
        where: { leaveDate: null },
        select: { player: { select: { puuid: true } } },
      },
    },
  });
  return teams.map((t) => ({
    teamId: t.id,
    name: t.name,
    tag: t.tag,
    puuids: t.memberships.map((m) => m.player.puuid).filter((p): p is string => Boolean(p)),
  }));
}

/**
 * Rattache ou crée les équipes d'un palier, et rend la correspondance
 * UUID Premier → identifiant d'équipe du site.
 *
 * Trois cas, dans cet ordre :
 *
 * 1. **Déjà rattachée** par `premierTeamId` — le chemin normal une fois le
 *    premier passage fait. Aucun appel réseau.
 * 2. **Reconnue par son roster** : au moins trois `puuid` en commun avec une
 *    équipe du site. C'est le seul rapprochement automatique, parce que c'est
 *    le seul signal fiable — les noms divergent entre le site et le Premier, et
 *    une fusion erronée se défait très mal. Coûte un appel par équipe inconnue,
 *    donc une fois pour toutes.
 * 3. **Créée**, en la marquant `premierManaged` : Riot devient sa source de
 *    vérité, nom compris. Si elle ressemble malgré tout à une fiche existante
 *    (même nom ou même tag), elle est signalée dans le rapport plutôt que
 *    rattachée d'office.
 *
 * Une équipe rattachée au cas 2 **garde le nom qu'on lui a donné ici** : il a
 * été choisi, il ne doit pas être écrasé par la synchronisation.
 */
export async function syncPremierTeams(
  entries: readonly PremierTeamEntry[]
): Promise<TeamSyncResult> {
  const byPremierId = new Map<string, string>();
  const suspects: string[] = [];
  let created = 0;
  let linked = 0;
  let rosterLinked = 0;
  let candidates: Awaited<ReturnType<typeof candidatesARattacher>> | null = null;

  for (const e of entries) {
    const existing = await db.team.findUnique({
      where: { premierTeamId: e.id },
      select: { id: true, name: true, tag: true, premierManaged: true },
    });

    if (existing) {
      linked += 1;
      byPremierId.set(e.id, existing.id);
      // Riot fait foi sur le nom des seules équipes qu'il nous a données.
      if (existing.premierManaged && (existing.name !== e.name || existing.tag !== e.tag)) {
        await db.team.update({
          where: { id: existing.id },
          data: { name: e.name, tag: e.tag },
        });
      }
      continue;
    }

    // La liste des candidates n'est chargée qu'au premier besoin : passé le
    // remplissage initial, aucune équipe n'est inconnue et la requête ne part
    // jamais.
    candidates ??= await candidatesARattacher();

    let roster: string[] = [];
    try {
      roster = (await getPremierTeam(e.id)).member.map((m) => m.puuid);
    } catch (err) {
      if (estQuotaDepasse(err)) throw err;
      logger.warn("premier.roster.failed", { premierTeamId: e.id, ...describeError(err) });
    }

    const match = bestRosterMatch(roster, candidates);
    if (match) {
      await db.team.update({
        where: { id: match.teamId },
        data: { premierTeamId: e.id },
      });
      rosterLinked += 1;
      byPremierId.set(e.id, match.teamId);
      candidates = candidates.filter((c) => c.teamId !== match.teamId);
      logger.info("premier.team.roster_linked", { premierTeamId: e.id, common: match.common });
      continue;
    }

    const ressemblance = candidates.find((c) => looksLikeSameTeam(e, c));
    if (ressemblance) suspects.push(`${e.name} (${e.tag})`);

    const team = await db.team.create({
      data: {
        name: e.name,
        tag: e.tag,
        region: "France",
        premierTeamId: e.id,
        premierManaged: true,
      },
      select: { id: true },
    });
    created += 1;
    byPremierId.set(e.id, team.id);
    await storePremierLogo(team.id, e.customization?.image);
  }

  return { created, linked, rosterLinked, suspects, byPremierId };
}

/**
 * Télécharge le logo d'équipe et le range dans le stockage du site.
 *
 * Pas de lien direct vers `cdn.henrikdev.xyz` : la CSP a été nettoyée de ses
 * sources d'images externes, et une équipe dont le logo pointe dehors le verrait
 * bloqué en production. Un logo manquant n'interrompt pas la synchronisation —
 * une fiche sans image reste une fiche utilisable.
 */
async function storePremierLogo(teamId: string, url: string | undefined): Promise<void> {
  if (!url) return;
  // `fetch` de Node n'a aucun délai d'abandon par défaut : sans ce garde-fou,
  // un CDN qui cale sur l'un des 72 logos suspend la synchronisation entière,
  // sans fin ni trace. Tous les autres appels du miroir sont bornés ; celui-ci
  // était passé au travers.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LOGO_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return;
    const buf = Buffer.from(await res.arrayBuffer());
    const key = await processAndStoreImage(buf, "teams", teamId);
    await db.team.update({ where: { id: teamId }, data: { logo: key } });
  } catch (e) {
    logger.warn("premier.logo.failed", { teamId, ...describeError(e) });
  } finally {
    clearTimeout(timeout);
  }
}

/** Au-delà, le logo est abandonné : une fiche sans image reste utilisable. */
const LOGO_TIMEOUT_MS = 10_000;
