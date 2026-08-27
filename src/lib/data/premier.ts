import { db } from "@/lib/db";
import { logger, describeError } from "@/lib/logger";
import { processAndStoreImage } from "@/lib/images";
import {
  frenchTiers,
  seasonOfMatch,
  seasonNumberOf,
  dedupeMatchIds,
  sideOfRoster,
  nextDelayMs,
  RATE_WINDOW_MS,
  type PremierTier,
} from "@/lib/premier-core";
import {
  getCustomMatchById,
  getPremierHistory,
  getPremierLeaderboard,
  getPremierSeasons,
} from "@/lib/henrikdev";
import type { PremierTeamEntry } from "@/lib/validation/premier";
import { importMatchMapFromRiotId } from "@/lib/match-stats";
import type { TournamentFormat } from "@/lib/constants";

/**
 * Écritures du miroir Premier.
 *
 * Ce module touche Prisma : il est hors du périmètre de couverture, comme le
 * reste de `src/lib/data/**`. Tout ce qui se décide sans base — palier,
 * rattachement à une saison, dédoublonnage, camps, étranglement — vit dans
 * `premier-core.ts` et y est testé.
 */

type Phase = "LEAGUE" | "PLAYOFFS";

export type TeamSyncResult = {
  created: number;
  linked: number;
  byPremierId: Map<string, string>;
};

/**
 * Rattache ou crée les équipes d'un palier, et rend la correspondance
 * UUID Premier → identifiant d'équipe du site.
 *
 * Le rattachement passe par `premierTeamId` et jamais par le nom : une équipe
 * qui se renomme côté Riot doit rester la même ici, sans quoi son historique de
 * matchs se scinderait en deux fiches.
 */
export async function syncPremierTeams(
  entries: readonly PremierTeamEntry[]
): Promise<TeamSyncResult> {
  const byPremierId = new Map<string, string>();
  let created = 0;
  let linked = 0;

  for (const e of entries) {
    const existing = await db.team.findUnique({
      where: { premierTeamId: e.id },
      select: { id: true, name: true, tag: true },
    });

    if (existing) {
      linked += 1;
      byPremierId.set(e.id, existing.id);
      // Riot fait foi sur le nom d'une équipe Premier : c'est là qu'elle se
      // renomme, et le site doit suivre plutôt qu'afficher un nom périmé.
      if (existing.name !== e.name || existing.tag !== e.tag) {
        await db.team.update({
          where: { id: existing.id },
          data: { name: e.name, tag: e.tag },
        });
      }
      continue;
    }

    const team = await db.team.create({
      data: { name: e.name, tag: e.tag, region: "France", premierTeamId: e.id },
      select: { id: true },
    });
    created += 1;
    byPremierId.set(e.id, team.id);
    await storePremierLogo(team.id, e.customization?.image);
  }

  return { created, linked, byPremierId };
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
  try {
    const res = await fetch(url);
    if (!res.ok) return;
    const buf = Buffer.from(await res.arrayBuffer());
    const key = await processAndStoreImage(buf, "teams", teamId);
    await db.team.update({ where: { id: teamId }, data: { logo: key } });
  } catch (e) {
    logger.warn("premier.logo.failed", { teamId, ...describeError(e) });
  }
}

/** Format du site pour un couple palier/phase. */
function formatFor(tier: PremierTier, phase: Phase): TournamentFormat {
  if (phase === "LEAGUE") return "LEAGUE";
  return tier === "CONTENDER" ? "PREMIER_CONTENDER" : "PREMIER_INVITE";
}

function nameFor(tier: PremierTier, phase: Phase, seasonNumber: number): string {
  const palier = tier === "CONTENDER" ? "Contender" : "Invite";
  const suffixe = phase === "PLAYOFFS" ? " — Playoffs" : "";
  return `Premier ${palier} France — Saison ${seasonNumber}${suffixe}`;
}

/**
 * Retrouve ou crée le tournoi d'un couple saison/palier/phase.
 *
 * L'idempotence tient à la contrainte unique
 * `(premierSeasonId, premierTier, premierPhase)` : rejouée, la synchronisation
 * retrouve le tournoi au lieu d'en créer un second à chaque passage du cron.
 */
export async function ensurePremierTournament(
  seasonId: string,
  seasonNumber: number,
  tier: PremierTier,
  phase: Phase
): Promise<string> {
  const existing = await db.tournament.findUnique({
    where: {
      premierSeasonId_premierTier_premierPhase: {
        premierSeasonId: seasonId,
        premierTier: tier,
        premierPhase: phase,
      },
    },
    select: { id: true },
  });
  if (existing) return existing.id;

  const t = await db.tournament.create({
    data: {
      name: nameFor(tier, phase, seasonNumber),
      region: "France",
      format: formatFor(tier, phase),
      status: "ONGOING",
      organizer: "Riot Games",
      premierSeasonId: seasonId,
      premierTier: tier,
      premierPhase: phase,
    },
    select: { id: true },
  });
  return t.id;
}

/**
 * Inscrit les équipes au tournoi, sans jamais en retirer.
 *
 * Une équipe qui quitte le Premier reste inscrite : retirer son
 * `TournamentParticipant` rendrait illisibles les matchs qu'elle a réellement
 * joués, qui eux restent en base.
 */
export async function syncParticipants(
  tournamentId: string,
  teamIds: readonly string[]
): Promise<number> {
  const r = await db.tournamentParticipant.createMany({
    data: teamIds.map((teamId) => ({ tournamentId, teamId })),
    skipDuplicates: true,
  });
  return r.count;
}

export type MatchImportOutcome = "IMPORTED" | "SKIPPED" | "FAILED";

/**
 * Crée le match du site puis y importe la carte Riot.
 *
 * Un match de ligue Premier se joue en une seule carte : un `Match` du site
 * porte donc exactement une `MatchMap`. La déduplication s'appuie sur l'unicité
 * de `MatchMap.riotMatchId` — inutile d'ajouter un champ au `Match`.
 */
export async function importPremierMatch(
  riotMatchId: string,
  tournamentId: string,
  teamIdByPremierId: ReadonlyMap<string, string>
): Promise<MatchImportOutcome> {
  const already = await db.matchMap.findUnique({
    where: { riotMatchId },
    select: { id: true },
  });
  if (already) return "SKIPPED";

  let raw;
  try {
    raw = await getCustomMatchById("eu", riotMatchId);
  } catch (e) {
    logger.warn("premier.match.fetch_failed", { riotMatchId, ...describeError(e) });
    return "FAILED";
  }

  const rosters = raw.teams.map((t) => t.rosterId).filter((x): x is string => Boolean(x));
  if (rosters.length !== 2) return "SKIPPED";

  const teamAId = teamIdByPremierId.get(rosters[0]);
  const teamBId = teamIdByPremierId.get(rosters[1]);
  // Un match contre une équipe hors périmètre — une autre conférence, une
  // division inférieure — n'a pas sa place ici : les deux camps doivent exister
  // sur le site, sinon le match afficherait un adversaire fantôme.
  if (!teamAId || !teamBId) return "SKIPPED";

  const sides = sideOfRoster(raw.teams, rosters[0]);
  if (!sides) return "FAILED";

  const match = await db.match.create({
    data: {
      tournamentId,
      teamAId,
      teamBId,
      stage: "GROUP",
      bestOf: 1,
      status: "FINISHED",
      date: raw.startedAt ? new Date(raw.startedAt) : null,
      hasTime: Boolean(raw.startedAt),
    },
    select: { id: true },
  });

  const r = await importMatchMapFromRiotId(match.id, {
    riotMatchId,
    outcomeOfTeamA: sides.outcomeOfTeamA,
  });
  if (r !== "IMPORTED") {
    // Sans carte, le match du site est une coquille vide qui polluerait les
    // listes. `Match` n'est la cible d'aucune cascade destructrice : la
    // suppression ne touche que lui et ses cartes.
    await db.match.delete({ where: { id: match.id } });
    logger.warn("premier.match.import_failed", { riotMatchId, result: r });
    return "FAILED";
  }
  return "IMPORTED";
}

export type SyncReport = {
  seasonId: string;
  seasonNumber: number;
  teamsCreated: number;
  teamsLinked: number;
  tournaments: string[];
  matchesImported: number;
  matchesFailed: number;
  matchesPending: number;
};

/**
 * Compteur de quota partagé par tous les appels d'un passage.
 *
 * `nextDelayMs` est pur et ne connaît ni l'horloge ni le sommeil : c'est ici
 * qu'on les branche, dans la couche d'accès où ils ont leur place.
 */
function rateGate() {
  let spent = 0;
  let windowStart = Date.now();
  return async function pay(cost = 2): Promise<void> {
    const wait = nextDelayMs({ spent, elapsedMs: Date.now() - windowStart });
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    if (Date.now() - windowStart >= RATE_WINDOW_MS) {
      spent = 0;
      windowStart = Date.now();
    }
    spent += cost;
  };
}

/**
 * Un passage de synchronisation, borné en nombre de matchs.
 *
 * Le premier remplissage représente environ 290 matchs par saison, soit une
 * vingtaine de minutes d'appels une fois l'étranglement appliqué : le bornage
 * l'étale sur plusieurs passages plutôt que de tenir une requête HTTP ouverte
 * tout ce temps. Le cron rappelle jusqu'à ce que `matchesPending` tombe à zéro,
 * et les passages suivants sont quasi gratuits — `MatchMap.riotMatchId` étant
 * unique, l'existant est sauté sans appel réseau.
 */
export async function runPremierSync(matchBudget: number, dryRun: boolean): Promise<SyncReport> {
  const pay = rateGate();
  await pay();
  const seasons = await getPremierSeasons("eu");
  const seasonIds = seasons.map((s) => s.id);
  const windows = seasons.map((s) => ({ id: s.id, startsAt: s.starts_at, endsAt: s.ends_at }));
  // La liste est rendue de la plus ancienne à la plus récente : la saison en
  // cours est la dernière.
  const current = seasonIds[seasonIds.length - 1] ?? "";
  const seasonNumber = seasonNumberOf(seasonIds, current) ?? seasonIds.length;

  const report: SyncReport = {
    seasonId: current,
    seasonNumber,
    teamsCreated: 0,
    teamsLinked: 0,
    tournaments: [],
    matchesImported: 0,
    matchesFailed: 0,
    matchesPending: 0,
  };
  if (!current) return report;

  for (const { conference, division, tier } of frenchTiers()) {
    await pay();
    const entries = await getPremierLeaderboard(conference, division);

    if (dryRun) {
      report.teamsLinked += entries.length;
      continue;
    }

    const teams = await syncPremierTeams(entries);
    report.teamsCreated += teams.created;
    report.teamsLinked += teams.linked;

    const league = await ensurePremierTournament(current, seasonNumber, tier, "LEAGUE");
    report.tournaments.push(league);
    await syncParticipants(league, [...teams.byPremierId.values()]);

    const histories: string[][] = [];
    for (const e of entries) {
      await pay();
      const h = await getPremierHistory(e.id);
      histories.push(
        h.league_matches
          .filter((m) => seasonOfMatch(windows, m.started_at) === current)
          .map((m) => m.id)
      );
    }

    for (const id of dedupeMatchIds(histories)) {
      if (report.matchesImported >= matchBudget) {
        report.matchesPending += 1;
        continue;
      }
      await pay();
      const r = await importPremierMatch(id, league, teams.byPremierId);
      if (r === "IMPORTED") report.matchesImported += 1;
      else if (r === "FAILED") report.matchesFailed += 1;
    }
  }

  return report;
}
