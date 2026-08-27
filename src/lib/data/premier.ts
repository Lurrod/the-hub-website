import { db } from "@/lib/db";
import { logger, describeError } from "@/lib/logger";
import { processAndStoreImage } from "@/lib/images";
import {
  frenchTiers,
  seasonOfMatch,
  seasonNumberOf,
  dedupeMatchIds,
  sideOfRoster,
  type PremierTier,
} from "@/lib/premier-core";
import {
  getCustomMatchById,
  getPremierHistory,
  getPremierLeaderboard,
  getPremierSeasons,
  RiotIdError,
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
    raw = await getCustomMatchById("eu", riotMatchId, true);
  } catch (e) {
    // Le dépassement de quota n'est pas l'échec d'un match : il arrête le
    // passage. Le laisser remonter permet à l'orchestration de rendre sa
    // progression au lieu de la perdre.
    if (e instanceof RiotIdError && e.code === "RATE_LIMITED") throw e;
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
  /** Une ligne par couple saison/palier effectivement traité. */
  seasons: { seasonNumber: number; tier: PremierTier; tournamentId: string; matches: number }[];
  teamsCreated: number;
  teamsLinked: number;
  matchesImported: number;
  matchesFailed: number;
  matchesPending: number;
  /** Le passage s'est-il arrêté sur le quota plutôt qu'au bout de son travail ? */
  rateLimited: boolean;
};

/** Le dépassement de quota est-il la cause de cette erreur ? */
function estQuotaDepasse(e: unknown): boolean {
  return e instanceof RiotIdError && e.code === "RATE_LIMITED";
}

/**
 * Un passage de synchronisation, borné en nombre de matchs.
 *
 * Le premier remplissage représente près de 300 matchs par saison : le bornage
 * l'étale sur plusieurs passages plutôt que de tenir une requête HTTP ouverte
 * tout ce temps. Le cron rappelle jusqu'à ce que `matchesPending` tombe à zéro,
 * et les passages suivants sont quasi gratuits — `MatchMap.riotMatchId` étant
 * unique, l'existant est sauté sans appel réseau.
 *
 * `seasonCount` remonte le miroir de plusieurs saisons. L'historique d'une
 * équipe les contient toutes : il n'est lu **qu'une fois par équipe**, puis les
 * matchs sont répartis par leur date. Interroger l'API une fois par saison
 * doublerait la facture pour la même donnée.
 *
 * Limite assumée : le classement est un instantané du présent. Une saison
 * passée est donc miroitée telle que la voient les équipes **actuellement**
 * dans ces divisions — une équipe descendue depuis n'y figure plus.
 */
export async function runPremierSync(
  matchBudget: number,
  dryRun: boolean,
  seasonCount = 1
): Promise<SyncReport> {
  const seasons = await getPremierSeasons("eu");
  const seasonIds = seasons.map((s) => s.id);
  const windows = seasons.map((s) => ({ id: s.id, startsAt: s.starts_at, endsAt: s.ends_at }));
  // La liste va de la plus ancienne à la plus récente : les saisons visées
  // sont les dernières.
  const targets = seasonIds.slice(-Math.max(1, seasonCount));

  const report: SyncReport = {
    seasons: [],
    teamsCreated: 0,
    teamsLinked: 0,
    matchesImported: 0,
    matchesFailed: 0,
    matchesPending: 0,
    rateLimited: false,
  };
  if (targets.length === 0) return report;

  try {
    for (const { conference, division, tier } of frenchTiers()) {
      const entries = await getPremierLeaderboard(conference, division);

      if (dryRun) {
        report.teamsLinked += entries.length;
        continue;
      }

      const teams = await syncPremierTeams(entries);
      report.teamsCreated += teams.created;
      report.teamsLinked += teams.linked;

      // Un tournoi par saison visée, tous alimentés par la même lecture
      // d'historique.
      const tournamentBySeason = new Map<string, string>();
      const idsBySeason = new Map<string, string[]>();
      for (const seasonId of targets) {
        const n = seasonNumberOf(seasonIds, seasonId) ?? seasonIds.length;
        const id = await ensurePremierTournament(seasonId, n, tier, "LEAGUE");
        tournamentBySeason.set(seasonId, id);
        idsBySeason.set(seasonId, []);
        await syncParticipants(id, [...teams.byPremierId.values()]);
        report.seasons.push({ seasonNumber: n, tier, tournamentId: id, matches: 0 });
      }

      // Un historique par équipe, réparti ensuite par saison. Les listes
      // restent séparées jusqu'au dédoublonnage : les deux équipes d'un match
      // le déclarent chacune, et sans ce filtre on paierait deux appels d'API
      // pour chaque match importé.
      const historiesBySeason = new Map<string, string[][]>(targets.map((s) => [s, []]));
      for (const e of entries) {
        const h = await getPremierHistory(e.id);
        const parEquipe = new Map<string, string[]>(targets.map((s) => [s, []]));
        for (const m of h.league_matches) {
          const season = seasonOfMatch(windows, m.started_at);
          parEquipe.get(season ?? "")?.push(m.id);
        }
        for (const seasonId of targets) {
          historiesBySeason.get(seasonId)!.push(parEquipe.get(seasonId)!);
        }
      }
      for (const seasonId of targets) {
        idsBySeason.set(seasonId, dedupeMatchIds(historiesBySeason.get(seasonId)!));
      }

      for (const seasonId of targets) {
        const tournamentId = tournamentBySeason.get(seasonId)!;
        const ligne = report.seasons.find((x) => x.tournamentId === tournamentId)!;
        for (const id of idsBySeason.get(seasonId)!) {
          if (report.matchesImported >= matchBudget) {
            report.matchesPending += 1;
            continue;
          }
          const r = await importPremierMatch(id, tournamentId, teams.byPremierId);
          if (r === "IMPORTED") {
            report.matchesImported += 1;
            ligne.matches += 1;
          } else if (r === "FAILED") report.matchesFailed += 1;
        }
      }
    }
  } catch (e) {
    // Un quota dépassé n'annule pas ce qui a déjà été écrit : équipes, tournois
    // et matchs importés sont acquis, et le passage suivant reprend là où
    // celui-ci s'arrête. Rendre le rapport plutôt que de lever évite au cron de
    // repartir de zéro toutes les quinze minutes.
    if (!estQuotaDepasse(e)) throw e;
    logger.warn("premier.sync.rate_limited", {
      matchesImported: report.matchesImported,
      teamsCreated: report.teamsCreated,
    });
    report.rateLimited = true;
  }

  return report;
}
