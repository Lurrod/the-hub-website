import { db } from "@/lib/db";
import {
  buildPlayerOverview,
  type PlayerOverview,
  type PlayerStatRow,
} from "@/lib/player-overview-core";

/**
 * Toutes les cartes stattées d'un joueur, mises à plat pour l'aperçu.
 * On part de PlayerGameStat plutôt que de Match : c'est la table qui dit
 * exactement quelles cartes le joueur a réellement jouées.
 */
export async function getPlayerOverview(playerId: string, limit = 200): Promise<PlayerOverview> {
  const stats = await db.playerGameStat.findMany({
    where: { playerId },
    orderBy: [{ matchMap: { startedAt: "desc" } }, { matchMap: { order: "desc" } }],
    take: limit,
    select: {
      teamSide: true,
      agent: true,
      kills: true,
      deaths: true,
      assists: true,
      acs: true,
      adr: true,
      hsPct: true,
      kast: true,
      rating: true,
      firstKills: true,
      firstDeaths: true,
      matchMap: {
        select: {
          mapName: true,
          scoreA: true,
          scoreB: true,
          startedAt: true,
          match: {
            select: {
              id: true,
              date: true,
              teamA: { select: { tag: true } },
              teamB: { select: { tag: true } },
            },
          },
        },
      },
    },
  });

  const rows: PlayerStatRow[] = stats.map((s) => {
    const side = s.teamSide === "A" ? "A" : "B";
    const mine = side === "A" ? s.matchMap.scoreA : s.matchMap.scoreB;
    const opp = side === "A" ? s.matchMap.scoreB : s.matchMap.scoreA;
    const opponent = side === "A" ? s.matchMap.match.teamB : s.matchMap.match.teamA;
    return {
      matchId: s.matchMap.match.id,
      mapName: s.matchMap.mapName,
      date: s.matchMap.startedAt ?? s.matchMap.match.date,
      agent: s.agent,
      kills: s.kills,
      deaths: s.deaths,
      assists: s.assists,
      acs: s.acs,
      adr: s.adr,
      hsPct: s.hsPct,
      kast: s.kast,
      rating: s.rating,
      firstKills: s.firstKills,
      firstDeaths: s.firstDeaths,
      win: mine > opp,
      opponentTag: opponent?.tag ?? null,
    };
  });

  return buildPlayerOverview(rows);
}
