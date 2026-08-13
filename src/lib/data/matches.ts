import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { MatchStage, MatchStatus } from "@/lib/constants";
import type { MatchInput, MatchMapInput } from "@/lib/validation/match";
import { syncTournamentStatusesIfStale } from "@/lib/tournament-status";
import { seriesScore } from "@/lib/match-stats-core";
import { cutoffWhere, headToHeadTally, type MatchCutoff } from "@/lib/match-context-core";
import { clampPage, pageOffset } from "@/lib/pagination";

function deriveWinnerId(data: {
  status: string;
  scoreA: number;
  scoreB: number;
  teamAId: string;
  teamBId: string;
}): string | null {
  if (data.status !== "FINISHED" || data.scoreA === data.scoreB) return null;
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

export function createMatch(tournamentId: string, data: MatchInput) {
  const winnerId = deriveWinnerId(data);
  return db.match.create({
    data: {
      tournamentId,
      groupId: data.stage === "GROUP" ? (data.groupId ?? null) : null,
      teamAId: data.teamAId,
      teamBId: data.teamBId,
      scoreA: data.scoreA,
      scoreB: data.scoreB,
      stage: data.stage as MatchStage,
      status: data.status as MatchStatus,
      bestOf: data.bestOf,
      round: data.stage === "BRACKET" ? (data.round ?? null) : null,
      bracketPosition: data.stage === "BRACKET" ? (data.bracketPosition ?? null) : null,
      date: data.date.date,
      hasTime: data.date.hasTime,
      vodUrl: data.vodUrl ?? null,
      winnerId,
    },
  });
}

export function updateMatch(id: string, tournamentId: string, data: MatchInput) {
  const winnerId = deriveWinnerId(data);
  return db.match.updateMany({
    where: { id, tournamentId },
    data: {
      groupId: data.stage === "GROUP" ? (data.groupId ?? null) : null,
      teamAId: data.teamAId,
      teamBId: data.teamBId,
      scoreA: data.scoreA,
      scoreB: data.scoreB,
      stage: data.stage as MatchStage,
      status: data.status as MatchStatus,
      bestOf: data.bestOf,
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
    include: { teamA: true, teamB: true },
    orderBy: [{ bracketPosition: "asc" }],
  });
}

export function listTournamentMatches(tournamentId: string) {
  return db.match.findMany({
    where: { tournamentId },
    include: { teamA: true, teamB: true, group: true },
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
    include: { teamA: true, teamB: true, tournament: true },
    orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
    take: limit,
  });
}

/** Matchs à venir ou en direct (pour la section « Prochains matchs »). */
export function listUpcomingMatches(limit = 8) {
  return db.match.findMany({
    where: { status: { in: ["SCHEDULED", "LIVE"] } },
    include: { teamA: true, teamB: true, tournament: true },
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
        include: { teamA: true, teamB: true, group: true },
        orderBy: [{ stage: "asc" }, { date: "asc" }],
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
    include: { teamA: true, teamB: true, tournament: true },
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
    include: { teamA: true, teamB: true },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    take: limit,
  });
}

/**
 * Derniers résultats d'une équipe, du plus récent au plus ancien.
 *
 * `cutoff` restreint aux matchs antérieurs à un match donné : c'est ce dont a
 * besoin la fiche de match, alors que la fiche d'équipe veut les plus récents
 * en date. Le paramètre est optionnel pour que l'appel existant depuis
 * `src/app/equipes/[id]/page.tsx` garde son comportement — une seconde
 * fonction pour une clause `where` de plus finirait par diverger de celle-ci.
 */
export function listTeamRecentMatches(teamId: string, limit = 4, cutoff?: MatchCutoff) {
  // `satisfies` est la seule chose qui relie la forme rendue par le noyau au
  // schéma Prisma : le noyau ne connaît pas `@prisma/client`, et TypeScript ne
  // contrôle pas les propriétés étalées dans un littéral. Sans cette ligne, un
  // renommage de `Match.date` compilerait et casserait à l'exécution.
  const bounds = cutoff ? (cutoffWhere(cutoff) satisfies Prisma.MatchWhereInput) : {};
  return db.match.findMany({
    where: {
      status: "FINISHED",
      OR: [{ teamAId: teamId }, { teamBId: teamId }],
      ...bounds,
    },
    include: { teamA: true, teamB: true },
    orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
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
 * Rencontres passées entre deux équipes, de la plus récente à la plus
 * ancienne, accompagnées du bilan.
 */
export async function getHeadToHead(
  teamAId: string,
  teamBId: string,
  cutoff: MatchCutoff,
  limit = HEAD_TO_HEAD_LIMIT
) {
  const bounds = cutoffWhere(cutoff) satisfies Prisma.MatchWhereInput;
  const matches = await db.match.findMany({
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
    },
    orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
    take: limit,
  });
  return { matches, ...headToHeadTally(matches, teamAId, teamBId) };
}

/**
 * Derniers matchs qu'un joueur a réellement joués — on part de ses lignes de
 * scoreboard, pas de son équipe. Un joueur sans équipe actuelle, ou qui a
 * changé d'équipe depuis, garde ainsi tout son historique.
 */
export function listPlayerRecentMatches(playerId: string, limit = 4) {
  return db.match.findMany({
    where: { maps: { some: { stats: { some: { playerId } } } } },
    include: { teamA: true, teamB: true },
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
    include: { teamA: true, teamB: true },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    take: limit,
  });
}
