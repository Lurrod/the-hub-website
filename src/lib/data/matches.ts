import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { MatchForfeit, MatchStage, MatchStatus, TournamentFormat } from "@/lib/constants";
import { forfeitWinnerId } from "@/lib/forfeit";
import { matchGroupIdFor } from "@/lib/bracket";
import type { MatchInput, MatchMapInput } from "@/lib/validation/match";
import { syncTournamentStatusesIfStale } from "@/lib/tournament-status";
import { seriesScore } from "@/lib/match-stats-core";
import { cutoffWhere, headToHeadTally, type MatchCutoff } from "@/lib/match-context-core";
import { clampPage, pageOffset } from "@/lib/pagination";

/**
 * Scores des maps, joints partout où un score de match s'affiche : sur un BO1,
 * `displayScores` remplace le « 1 - 0 » de série par le score de la map. Le
 * fragment est partagé pour qu'aucune liste ne raconte un autre score que le
 * bracket ou la fiche du même match.
 */
const MAPS_SCORES = {
  maps: { select: { scoreA: true, scoreB: true }, orderBy: { order: "asc" as const } },
};

function deriveWinnerId(data: {
  status: string;
  scoreA: number;
  scoreB: number;
  teamAId: string;
  teamBId: string;
  forfeit?: MatchForfeit;
}): string | null {
  if (data.status !== "FINISHED") return null;
  // Le forfait prime sur le score : il se déclare le plus souvent à 0-0.
  const byForfeit = forfeitWinnerId(data.forfeit ?? "NONE", data.teamAId, data.teamBId);
  if (byForfeit) return byForfeit;
  if (data.scoreA === data.scoreB) return null;
  return data.scoreA > data.scoreB ? data.teamAId : data.teamBId;
}

// ---- Poules ----

export function createGroup(tournamentId: string, name: string) {
  return db.group.create({ data: { tournamentId, name } });
}

export function deleteGroup(id: string, tournamentId: string) {
  return db.group.deleteMany({ where: { id, tournamentId } });
}

export function getGroupsWithMatches(tournamentId: string) {
  return db.group.findMany({
    where: { tournamentId },
    orderBy: { name: "asc" },
    include: {
      participants: { include: { team: true } },
      matches: {
        where: { stage: "GROUP", status: "FINISHED" },
        include: { teamA: true, teamB: true },
        orderBy: { date: "asc" },
      },
    },
  });
}

export function assignParticipantGroup(
  tournamentId: string,
  teamId: string,
  groupId: string | null
) {
  return db.tournamentParticipant.update({
    where: { tournamentId_teamId: { tournamentId, teamId } },
    data: { groupId },
  });
}

// ---- Matchs ----

export function createMatch(tournamentId: string, data: MatchInput, format: TournamentFormat) {
  const winnerId = deriveWinnerId(data);
  return db.match.create({
    data: {
      tournamentId,
      groupId: matchGroupIdFor(format, data.stage, data.groupId),
      teamAId: data.teamAId,
      teamBId: data.teamBId,
      scoreA: data.scoreA,
      scoreB: data.scoreB,
      stage: data.stage as MatchStage,
      status: data.status as MatchStatus,
      bestOf: data.bestOf,
      forfeit: data.forfeit,
      round: data.stage === "BRACKET" ? (data.round ?? null) : null,
      bracketPosition: data.stage === "BRACKET" ? (data.bracketPosition ?? null) : null,
      date: data.date.date,
      hasTime: data.date.hasTime,
      vodUrl: data.vodUrl ?? null,
      winnerId,
    },
  });
}

export function updateMatch(
  id: string,
  tournamentId: string,
  data: MatchInput,
  format: TournamentFormat
) {
  const winnerId = deriveWinnerId(data);
  return db.match.updateMany({
    where: { id, tournamentId },
    data: {
      groupId: matchGroupIdFor(format, data.stage, data.groupId),
      teamAId: data.teamAId,
      teamBId: data.teamBId,
      scoreA: data.scoreA,
      scoreB: data.scoreB,
      stage: data.stage as MatchStage,
      status: data.status as MatchStatus,
      bestOf: data.bestOf,
      forfeit: data.forfeit,
      round: data.stage === "BRACKET" ? (data.round ?? null) : null,
      bracketPosition: data.stage === "BRACKET" ? (data.bracketPosition ?? null) : null,
      date: data.date.date ?? null,
      hasTime: data.date.hasTime,
      vodUrl: data.vodUrl ?? null,
      winnerId,
    },
  });
}

export function deleteMatch(id: string, tournamentId: string) {
  return db.match.deleteMany({ where: { id, tournamentId } });
}

export function getMatch(id: string) {
  return db.match.findUnique({
    where: { id },
    include: {
      teamA: true,
      teamB: true,
      tournament: true,
      group: true,
      maps: {
        orderBy: { order: "asc" },
        include: {
          stats: {
            include: { player: { select: { id: true, pseudo: true } } },
          },
        },
      },
    },
  });
}

export function listBracketMatches(tournamentId: string) {
  return db.match.findMany({
    where: { tournamentId, stage: "BRACKET" },
    // Le groupe porte le bracket parallèle en Premier Contender : sans lui,
    // `buildBracket` verrait tous les matchs comme orphelins et n'en ferait
    // qu'un seul arbre. Les maps servent au score des BO1, où la case affiche
    // le score de la map plutôt qu'un « 1 - 0 » qui n'apprend rien.
    include: {
      teamA: true,
      teamB: true,
      group: { select: { id: true, name: true } },
      ...MAPS_SCORES,
    },
    orderBy: [{ bracketPosition: "asc" }],
  });
}

export function listTournamentMatches(tournamentId: string) {
  return db.match.findMany({
    where: { tournamentId },
    include: { teamA: true, teamB: true, group: true, ...MAPS_SCORES },
    orderBy: [{ date: "asc" }],
  });
}

/** Noms des poules d'un tournoi (stages de phase de groupes). */
export function listGroups(tournamentId: string) {
  return db.group.findMany({
    where: { tournamentId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

// ---- Maps ----

export function addMatchMap(matchId: string, data: MatchMapInput) {
  return db.matchMap.create({
    data: {
      matchId,
      mapName: data.mapName,
      scoreA: data.scoreA,
      scoreB: data.scoreB,
      order: data.order,
    },
  });
}

export function removeMatchMap(id: string, matchId: string) {
  return db.matchMap.deleteMany({ where: { id, matchId } });
}

/**
 * Réaligne le score du match sur ses maps. À appeler après chaque ajout ou
 * retrait de map : sans ça, retirer une map laissait le score de la série figé
 * sur sa valeur d'avant (un 1-1 restait 1-1).
 */
export async function syncMatchScoreFromMaps(matchId: string): Promise<void> {
  const match = await db.match.findUnique({
    where: { id: matchId },
    select: {
      status: true,
      teamAId: true,
      teamBId: true,
      forfeit: true,
      maps: { select: { scoreA: true, scoreB: true } },
    },
  });
  if (!match) return;

  const { scoreA, scoreB } = seriesScore(match.maps);
  await db.match.update({
    where: { id: matchId },
    data: { scoreA, scoreB, winnerId: deriveWinnerId({ ...match, scoreA, scoreB }) },
  });
}

// ---- Feed d'accueil ----

export function listRecentResults(limit = 5) {
  return db.match.findMany({
    where: { status: "FINISHED" },
    include: { teamA: true, teamB: true, tournament: true, ...MAPS_SCORES },
    orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
    take: limit,
  });
}

/** Matchs à venir ou en direct (pour la section « Prochains matchs »). */
export function listUpcomingMatches(limit = 8) {
  return db.match.findMany({
    where: { status: { in: ["SCHEDULED", "LIVE"] } },
    include: { teamA: true, teamB: true, tournament: true, ...MAPS_SCORES },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    take: limit,
  });
}

/** Bilan agrégé d'une équipe sur l'ensemble de ses matchs terminés. */
export async function getTeamRecord(teamId: string) {
  const matches = await db.match.findMany({
    where: { status: "FINISHED", OR: [{ teamAId: teamId }, { teamBId: teamId }] },
    select: { teamAId: true, scoreA: true, scoreB: true, winnerId: true },
  });
  let played = 0;
  let wins = 0;
  let losses = 0;
  let mapDiff = 0;
  for (const m of matches) {
    played++;
    const isA = m.teamAId === teamId;
    mapDiff += isA ? m.scoreA - m.scoreB : m.scoreB - m.scoreA;
    if (m.winnerId === teamId) wins++;
    else if (m.winnerId != null) losses++;
  }
  const winrate = played > 0 ? Math.round((wins / played) * 100) : 0;
  return { played, wins, losses, mapDiff, winrate };
}

export type MatchStatusFilter = "all" | "upcoming" | "finished";

const MATCH_STATUS_WHERE: Record<MatchStatusFilter, Prisma.MatchWhereInput> = {
  all: {},
  upcoming: { status: { not: "FINISHED" } },
  finished: { status: "FINISHED" },
};

/** Tournois par page sur l'index /matchs. */
export const TOURNAMENTS_PER_PAGE = 10;
/**
 * Matchs affichés par tournoi sur l'index. Au-delà, la fiche du tournoi prend
 * le relais — l'index n'a pas vocation à rendre une saison entière d'un coup.
 */
export const MATCHES_PER_TOURNAMENT = 60;

/**
 * Tournois ayant au moins un match, avec leurs matchs (index /matchs).
 *
 * Le filtre de statut est appliqué EN BASE et non après coup : cette fonction
 * chargeait auparavant tous les matchs de tous les tournois du site à chaque
 * affichage de la page, pour n'en garder qu'une partie.
 */
export async function listTournamentsWithMatches(options?: {
  filter?: MatchStatusFilter;
  page?: number;
}) {
  await syncTournamentStatusesIfStale();

  const matchWhere = MATCH_STATUS_WHERE[options?.filter ?? "all"];
  const where = { matches: { some: matchWhere } };

  // Le total est lu d'abord pour borner la page demandée : un `?p=99` saisi à
  // la main affiche la dernière page, pas une liste vide.
  const total = await db.tournament.count({ where });
  const page = clampPage(options?.page ?? 1, total, TOURNAMENTS_PER_PAGE);

  const tournaments = await db.tournament.findMany({
    where,
    orderBy: [{ status: "asc" }, { name: "asc" }],
    skip: pageOffset(page, TOURNAMENTS_PER_PAGE),
    take: TOURNAMENTS_PER_PAGE,
    include: {
      // `_count` porte le total réel : la liste étant plafonnée, c'est lui qui
      // permet d'annoncer honnêtement ce qui n'est pas affiché.
      _count: { select: { matches: { where: matchWhere } } },
      matches: {
        where: matchWhere,
        include: { teamA: true, teamB: true, group: true, ...MAPS_SCORES },
        // Du plus récent au plus ancien : l'index sert d'abord à retrouver les
        // derniers résultats, pas à relire le début du tournoi. Le plafond
        // retient donc aussi les rencontres les plus fraîches. Exception pour
        // « À venir », où l'ordre naturel reste le prochain coup d'envoi en
        // tête — inversé, le match le plus lointain ouvrirait la liste.
        orderBy:
          (options?.filter ?? "all") === "upcoming"
            ? [{ date: { sort: "asc", nulls: "last" } as const }, { createdAt: "asc" as const }]
            : [{ date: { sort: "desc", nulls: "last" } as const }, { updatedAt: "desc" as const }],
        take: MATCHES_PER_TOURNAMENT,
      },
    },
  });

  return { tournaments, total, page, pageSize: TOURNAMENTS_PER_PAGE };
}

/**
 * Matchs joués d'une équipe, regroupés par tournoi. Les matchs étant déjà triés
 * du plus récent au plus ancien, l'ordre d'insertion de la Map classe les
 * tournois par date de dernier match.
 */
export async function getTeamMatchesByTournament(teamId: string, limit = 200) {
  const matches = await db.match.findMany({
    where: { status: "FINISHED", OR: [{ teamAId: teamId }, { teamBId: teamId }] },
    include: { teamA: true, teamB: true, tournament: true, ...MAPS_SCORES },
    orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
    take: limit,
  });

  type Entry = { tournament: (typeof matches)[number]["tournament"]; matches: typeof matches };
  const byTournament = new Map<string, Entry>();
  for (const m of matches) {
    const found = byTournament.get(m.tournamentId);
    if (found) found.matches.push(m);
    else byTournament.set(m.tournamentId, { tournament: m.tournament, matches: [m] });
  }
  return [...byTournament.values()];
}

/** Prochains matchs d'une équipe (programmés ou en direct), du plus proche au plus lointain. */
export function listTeamUpcomingMatches(teamId: string, limit = 4) {
  return db.match.findMany({
    where: {
      status: { in: ["SCHEDULED", "LIVE"] },
      OR: [{ teamAId: teamId }, { teamBId: teamId }],
    },
    include: { teamA: true, teamB: true, ...MAPS_SCORES },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    take: limit,
  });
}

/**
 * Traduit la borne du noyau en fragment de `where` Prisma.
 *
 * Le littéral est reconstruit ici plutôt qu'étalé tel quel : c'est ce qui fait
 * vérifier par TypeScript que `id` et `date` existent encore au schéma. Un
 * `satisfies` sur la valeur rendue par `cutoffWhere` ne le ferait pas — le
 * contrôle des propriétés en trop ne s'applique qu'aux littéraux frais.
 */
function cutoffBounds(cutoff: MatchCutoff): Prisma.MatchWhereInput {
  const { id, date } = cutoffWhere(cutoff);
  return date ? { id, date } : { id };
}

/**
 * Derniers résultats d'une équipe, du plus récent au plus ancien.
 *
 * `cutoff` restreint à ce qui n'est pas postérieur à un match donné : c'est ce dont a
 * besoin la fiche de match, alors que la fiche d'équipe veut les plus récents
 * en date. Le paramètre est optionnel pour que l'appel existant depuis
 * `src/app/equipes/[id]/page.tsx` garde son comportement — une seconde
 * fonction pour une clause `where` de plus finirait par diverger de celle-ci.
 */
export function listTeamRecentMatches(teamId: string, limit = 4, cutoff?: MatchCutoff) {
  const bounds = cutoff ? cutoffBounds(cutoff) : {};
  return db.match.findMany({
    where: {
      status: "FINISHED",
      OR: [{ teamAId: teamId }, { teamBId: teamId }],
      ...bounds,
    },
    include: {
      // Seuls le nom, le tag et le logo sont consommés — pas de raison de
      // faire circuler `inviteToken` et `inviteExpiresAt` avec le reste.
      teamA: { select: { name: true, tag: true, logo: true } },
      teamB: { select: { name: true, tag: true, logo: true } },
      ...MAPS_SCORES,
    },
    // `nulls: "last"` évite qu'un match affiché sans date — cutoff réduit à sa
    // seule exclusion — fasse remonter en tête les autres matchs sans date.
    orderBy: [{ date: { sort: "desc", nulls: "last" } }, { updatedAt: "desc" }],
    take: limit,
  });
}

/**
 * Plafond des rencontres remontées. Le bilan affiché porte sur ces
 * rencontres-là et pas sur l'historique entier : un total qui ne
 * correspondrait pas aux lignes juste en dessous serait plus déroutant qu'un
 * total tronqué. La page le dit quand le plafond a joué.
 */
export const HEAD_TO_HEAD_LIMIT = 10;

/**
 * Longueur de la série de forme affichée par équipe. Cinq plutôt que les
 * quatre de la fiche d'équipe : ici la forme est une lecture en soi, pas un
 * aperçu qui renvoie ailleurs.
 */
export const TEAM_FORM_LIMIT = 5;

/**
 * Rencontres passées entre deux équipes, de la plus récente à la plus
 * ancienne, accompagnées du bilan.
 */
export async function getHeadToHead(
  teamAId: string,
  teamBId: string,
  cutoff: MatchCutoff,
  limit = HEAD_TO_HEAD_LIMIT
) {
  const bounds = cutoffBounds(cutoff);
  const rows = await db.match.findMany({
    where: {
      status: "FINISHED",
      OR: [
        { teamAId, teamBId },
        { teamAId: teamBId, teamBId: teamAId },
      ],
      ...bounds,
    },
    include: {
      teamA: { select: { name: true, tag: true, logo: true } },
      teamB: { select: { name: true, tag: true, logo: true } },
      // Sans le nom du tournoi, dix lignes de score ne se distinguent pas.
      tournament: { select: { name: true } },
      ...MAPS_SCORES,
    },
    orderBy: [{ date: { sort: "desc", nulls: "last" } }, { updatedAt: "desc" }],
    // Une ligne de plus que le plafond : c'est ce qui distingue « exactement
    // dix rencontres » de « plus de dix, tronquées ».
    take: limit + 1,
  });
  const matches = rows.slice(0, limit);
  return {
    matches,
    truncated: rows.length > limit,
    // Le plafond voyage avec le résultat : la page annonce « sur les N
    // dernières rencontres » et mentirait si elle lisait la constante alors
    // qu'un appelant a passé un autre `limit`.
    limit,
    ...headToHeadTally(matches, teamAId, teamBId),
  };
}

/**
 * Derniers matchs qu'un joueur a réellement joués — on part de ses lignes de
 * scoreboard, pas de son équipe. Un joueur sans équipe actuelle, ou qui a
 * changé d'équipe depuis, garde ainsi tout son historique.
 */
export function listPlayerRecentMatches(playerId: string, limit = 4) {
  return db.match.findMany({
    where: { maps: { some: { stats: { some: { playerId } } } } },
    include: { teamA: true, teamB: true, ...MAPS_SCORES },
    orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
    take: limit,
  });
}

/**
 * Prochains matchs d'un joueur : ceux des équipes dont il est membre
 * aujourd'hui. Un match à venir n'engage que des équipes, c'est donc le seul
 * rattachement possible — mais il passe par ses adhésions actives, pas par une
 * équipe « principale » choisie arbitrairement.
 */
export function listPlayerUpcomingMatches(playerId: string, limit = 4) {
  const onRoster = { memberships: { some: { playerId, leaveDate: null } } };
  return db.match.findMany({
    where: {
      status: { in: ["SCHEDULED", "LIVE"] },
      OR: [{ teamA: onRoster }, { teamB: onRoster }],
    },
    include: { teamA: true, teamB: true, ...MAPS_SCORES },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    take: limit,
  });
}
