import { db } from "@/lib/db";
import type { TimelineEntry } from "@/lib/match-stats-core";
import {
  buildTeamStats,
  type TeamMapEntry,
  type TeamMatchEntry,
  type TeamPlayerEntry,
  type TeamRound,
  type TeamStats,
} from "@/lib/tournament-teams-core";

/**
 * Statistiques collectives de toutes les équipes d'un tournoi, en une requête.
 *
 * On part des matchs terminés et on retourne chaque carte du point de vue des
 * DEUX équipes : c'est ce qui permet de parler d'attaque, de retard comblé ou
 * de série de rounds sans refaire le calcul deux fois côté appelant.
 */
export async function getTournamentTeamStats(tournamentId: string): Promise<TeamStats[]> {
  const matches = await db.match.findMany({
    where: { tournamentId, status: "FINISHED" },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      teamAId: true,
      teamBId: true,
      scoreA: true,
      scoreB: true,
      teamA: { select: { id: true, name: true, tag: true, logo: true } },
      teamB: { select: { id: true, name: true, tag: true, logo: true } },
      maps: {
        orderBy: { order: "asc" },
        select: {
          mapName: true,
          scoreA: true,
          scoreB: true,
          roundTimeline: true,
          stats: {
            select: {
              playerId: true,
              teamSide: true,
              agent: true,
              kills: true,
              deaths: true,
              assists: true,
              acs: true,
              rating: true,
              firstKills: true,
              firstDeaths: true,
              riotName: true,
              player: { select: { pseudo: true, nationality: true } },
            },
          },
        },
      },
    },
  });

  const identities = new Map<
    string,
    { id: string; name: string; tag: string; logo: string | null }
  >();
  const teamMatches: TeamMatchEntry[] = [];
  const teamMaps: TeamMapEntry[] = [];
  /** Cumuls par (équipe, joueur) : un joueur peut jouer pour deux équipes. */
  const playerAgg = new Map<string, TeamPlayerEntry>();

  for (const m of matches) {
    if (m.teamA) identities.set(m.teamA.id, m.teamA);
    if (m.teamB) identities.set(m.teamB.id, m.teamB);

    for (const side of ["A", "B"] as const) {
      const teamId = side === "A" ? m.teamAId : m.teamBId;
      const mine = side === "A" ? m.scoreA : m.scoreB;
      const opp = side === "A" ? m.scoreB : m.scoreA;
      teamMatches.push({
        teamId,
        matchId: m.id,
        result: mine > opp ? "WIN" : mine < opp ? "LOSS" : "DRAW",
      });
    }

    for (const mp of m.maps) {
      const timeline: TimelineEntry[] = Array.isArray(mp.roundTimeline)
        ? (mp.roundTimeline as unknown as TimelineEntry[])
        : [];

      for (const side of ["A", "B"] as const) {
        const teamId = side === "A" ? m.teamAId : m.teamBId;
        const roundsFor = side === "A" ? mp.scoreA : mp.scoreB;
        const roundsAgainst = side === "A" ? mp.scoreB : mp.scoreA;

        const rounds: TeamRound[] = timeline.map((t) => ({
          won: t.w === side,
          outcome: t.o,
          attacking: t.s == null ? null : t.s === side,
          loadout: (side === "A" ? t.ea : t.eb) ?? null,
          oppLoadout: (side === "A" ? t.eb : t.ea) ?? null,
        }));

        teamMaps.push({
          teamId,
          matchId: m.id,
          mapName: mp.mapName,
          roundsFor,
          roundsAgainst,
          won: roundsFor > roundsAgainst,
          rounds,
        });
      }

      for (const s of mp.stats) {
        const teamId = s.teamSide === "A" ? m.teamAId : m.teamBId;
        const key = `${teamId}::${s.playerId ?? s.riotName}`;
        const entry = playerAgg.get(key) ?? {
          teamId,
          playerId: s.playerId,
          name: s.player?.pseudo ?? s.riotName,
          nationality: s.player?.nationality ?? null,
          maps: 0,
          kills: 0,
          deaths: 0,
          assists: 0,
          acsSum: 0,
          ratingSum: 0,
          firstKills: 0,
          firstDeaths: 0,
          agents: [] as string[],
        };
        entry.maps += 1;
        entry.kills += s.kills;
        entry.deaths += s.deaths;
        entry.assists += s.assists;
        entry.acsSum += s.acs;
        entry.ratingSum += s.rating;
        entry.firstKills += s.firstKills;
        entry.firstDeaths += s.firstDeaths;
        if (s.agent) entry.agents.push(s.agent);
        playerAgg.set(key, entry);
      }
    }
  }

  const allPlayers = [...playerAgg.values()];

  return [...identities.values()]
    .map((identity) =>
      buildTeamStats(
        identity,
        teamMatches.filter((t) => t.teamId === identity.id),
        teamMaps.filter((t) => t.teamId === identity.id),
        allPlayers.filter((p) => p.teamId === identity.id)
      )
    )
    .sort(
      (a, b) =>
        b.matchesWon - a.matchesWon ||
        b.roundDiff - a.roundDiff ||
        a.team.name.localeCompare(b.team.name)
    );
}
