import { db } from "@/lib/db";

export type TeamAgents = {
  id: string;
  name: string;
  tag: string;
  logo: string | null;
  agents: string[];
};

/** Une carte jouée par le joueur (une ligne). */
export type PlayerMapRow = {
  matchId: string;
  mapName: string;
  win: boolean;
  myScore: number;
  oppScore: number;
  durationSec: number;
  agent: string | null;
  rating: number;
  acs: number;
  kills: number;
  deaths: number;
  assists: number;
  kast: number;
  playerTeamId: string;
  opponent: { name: string; tag: string; logo: string | null } | null;
  teamA: TeamAgents | null;
  teamB: TeamAgents | null;
};

/** Un jour de compétition = un bandeau + ses cartes. */
export type PlayerMatchDay = {
  key: string;
  date: Date | null;
  tournament: { id: string; name: string; logo: string | null };
  stage: string;
  bestOf: number;
  maps: PlayerMapRow[];
};

const STAGE_LABELS = { GROUP: "Phase de groupes", BRACKET: "Playoffs" } as const;

/**
 * Cartes jouées par un joueur, groupées par jour. Chaque BO est éclaté en une
 * ligne par carte ; le bandeau du jour porte tournoi / stage / BO.
 */
export async function getPlayerMatches(playerId: string, limit = 30): Promise<PlayerMatchDay[]> {
  const matches = await db.match.findMany({
    where: { maps: { some: { stats: { some: { playerId } } } } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: limit,
    include: {
      teamA: { select: { id: true, name: true, tag: true, logo: true } },
      teamB: { select: { id: true, name: true, tag: true, logo: true } },
      tournament: { select: { id: true, name: true, logo: true } },
      group: { select: { name: true } },
      maps: {
        orderBy: { order: "asc" },
        select: {
          mapName: true,
          scoreA: true,
          scoreB: true,
          durationSec: true,
          stats: {
            select: {
              playerId: true,
              teamSide: true,
              agent: true,
              acs: true,
              kills: true,
              deaths: true,
              assists: true,
              rating: true,
              kast: true,
            },
          },
        },
      },
    },
  });

  const days = new Map<string, PlayerMatchDay>();

  for (const m of matches) {
    const stage =
      m.stage === "BRACKET"
        ? `${STAGE_LABELS.BRACKET}${m.round ? ` · ${m.round}` : ""}`
        : `${STAGE_LABELS.GROUP}${m.group ? ` · ${m.group.name}` : ""}`;
    const key = m.date ? new Date(m.date).toISOString().slice(0, 10) : `nd-${m.id}`;

    if (!days.has(key)) {
      days.set(key, {
        key,
        date: m.date,
        tournament: m.tournament,
        stage,
        bestOf: m.bestOf,
        maps: [],
      });
    }
    const day = days.get(key)!;

    for (const mp of m.maps) {
      const mine = mp.stats.find((s) => s.playerId === playerId);
      if (!mine) continue;
      const side = mine.teamSide as "A" | "B";
      const myScore = side === "A" ? mp.scoreA : mp.scoreB;
      const oppScore = side === "A" ? mp.scoreB : mp.scoreA;
      const agentsForSide = (s: "A" | "B") =>
        mp.stats
          .filter((r) => r.teamSide === s)
          .map((r) => r.agent ?? "")
          .filter(Boolean);

      const teamA: TeamAgents | null = m.teamA ? { ...m.teamA, agents: agentsForSide("A") } : null;
      const teamB: TeamAgents | null = m.teamB ? { ...m.teamB, agents: agentsForSide("B") } : null;
      const opponent = side === "A" ? m.teamB : m.teamA;

      day.maps.push({
        matchId: m.id,
        mapName: mp.mapName,
        win: myScore > oppScore,
        myScore,
        oppScore,
        durationSec: mp.durationSec ?? 0,
        agent: mine.agent,
        rating: Math.round(mine.rating * 100) / 100,
        acs: mine.acs,
        kills: mine.kills,
        deaths: mine.deaths,
        assists: mine.assists,
        kast: mine.kast,
        playerTeamId: side === "A" ? m.teamAId : m.teamBId,
        opponent: opponent ? { name: opponent.name, tag: opponent.tag, logo: opponent.logo } : null,
        teamA,
        teamB,
      });
    }
  }

  return [...days.values()].filter((d) => d.maps.length > 0);
}
