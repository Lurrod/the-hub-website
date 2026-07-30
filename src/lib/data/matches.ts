import { db } from "@/lib/db";
import type { MatchStage, MatchStatus } from "@/lib/constants";
import type { MatchInput, MatchMapInput } from "@/lib/validation/match";

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

export function assignParticipantGroup(tournamentId: string, teamId: string, groupId: string | null) {
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
      groupId: data.stage === "GROUP" ? data.groupId ?? null : null,
      teamAId: data.teamAId,
      teamBId: data.teamBId,
      scoreA: data.scoreA,
      scoreB: data.scoreB,
      stage: data.stage as MatchStage,
      status: data.status as MatchStatus,
      bestOf: data.bestOf,
      round: data.stage === "BRACKET" ? data.round ?? null : null,
      bracketPosition: data.stage === "BRACKET" ? data.bracketPosition ?? null : null,
      date: data.date,
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
      groupId: data.stage === "GROUP" ? data.groupId ?? null : null,
      teamAId: data.teamAId,
      teamBId: data.teamBId,
      scoreA: data.scoreA,
      scoreB: data.scoreB,
      stage: data.stage as MatchStage,
      status: data.status as MatchStatus,
      bestOf: data.bestOf,
      round: data.stage === "BRACKET" ? data.round ?? null : null,
      bracketPosition: data.stage === "BRACKET" ? data.bracketPosition ?? null : null,
      date: data.date ?? null,
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

/** Tournois ayant au moins un match, avec leurs matchs (pour l'index /matchs). */
export function listTournamentsWithMatches() {
  return db.tournament.findMany({
    where: { matches: { some: {} } },
    orderBy: [{ status: "asc" }, { name: "asc" }],
    include: {
      matches: {
        include: { teamA: true, teamB: true, group: true },
        orderBy: [{ stage: "asc" }, { date: "asc" }],
      },
    },
  });
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

/** Derniers résultats d'une équipe, du plus récent au plus ancien. */
export function listTeamRecentMatches(teamId: string, limit = 4) {
  return db.match.findMany({
    where: { status: "FINISHED", OR: [{ teamAId: teamId }, { teamBId: teamId }] },
    include: { teamA: true, teamB: true },
    orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
    take: limit,
  });
}
