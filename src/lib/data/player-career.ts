import { db } from "@/lib/db";

export type CareerStint = {
  membershipId: string;
  teamId: string;
  teamName: string;
  teamTag: string;
  teamLogo: string | null;
  role: string;
  joinDate: Date | null;
  leaveDate: Date | null;
  games: number;
  winRate: number | null;
  topAgents: string[];
  extraAgents: number;
};

/**
 * Carrière d'un joueur, façon tableau « Teams » : un passage par ligne, avec
 * parties / win% / top persos calculés sur les matchs joués durant ce passage.
 */
export async function getPlayerCareer(playerId: string): Promise<CareerStint[]> {
  const [memberships, rows] = await Promise.all([
    db.teamMembership.findMany({
      where: { playerId },
      include: { team: true },
      orderBy: { joinDate: "desc" },
    }),
    db.playerGameStat.findMany({
      where: { playerId },
      select: {
        teamSide: true,
        agent: true,
        matchMap: {
          select: {
            scoreA: true,
            scoreB: true,
            match: { select: { date: true, teamAId: true, teamBId: true } },
          },
        },
      },
    }),
  ]);

  // Une entrée par carte jouée : équipe du joueur, victoire de la carte, date, agent.
  const norm = rows.map((r) => {
    const mt = r.matchMap.match;
    const teamId = r.teamSide === "A" ? mt.teamAId : mt.teamBId;
    const my = r.teamSide === "A" ? r.matchMap.scoreA : r.matchMap.scoreB;
    const opp = r.teamSide === "A" ? r.matchMap.scoreB : r.matchMap.scoreA;
    return { teamId, agent: r.agent, date: mt.date, win: my > opp };
  });

  // Nb de passages par équipe : si un seul, on ne filtre pas par date (dates seed peu fiables).
  const stintsPerTeam = new Map<string, number>();
  for (const ms of memberships)
    stintsPerTeam.set(ms.teamId, (stintsPerTeam.get(ms.teamId) ?? 0) + 1);

  return memberships.map((ms) => {
    const single = (stintsPerTeam.get(ms.teamId) ?? 0) <= 1;
    const join = ms.joinDate ? new Date(ms.joinDate).getTime() : -Infinity;
    const leave = ms.leaveDate ? new Date(ms.leaveDate).getTime() : Infinity;
    const mine = norm.filter((n) => {
      if (n.teamId !== ms.teamId) return false;
      if (single) return true;
      if (!n.date) return false;
      const t = new Date(n.date).getTime();
      return t >= join && t <= leave;
    });

    const games = mine.length;
    const wins = mine.filter((n) => n.win).length;
    const count = new Map<string, number>();
    for (const n of mine) if (n.agent) count.set(n.agent, (count.get(n.agent) ?? 0) + 1);
    const agents = [...count.entries()].sort((a, b) => b[1] - a[1]).map(([a]) => a);

    return {
      membershipId: ms.id,
      teamId: ms.teamId,
      teamName: ms.team.name,
      teamTag: ms.team.tag,
      teamLogo: ms.team.logo,
      role: ms.role,
      joinDate: ms.joinDate,
      leaveDate: ms.leaveDate,
      games,
      winRate: games > 0 ? Math.round((wins / games) * 100) : null,
      topAgents: agents.slice(0, 3),
      extraAgents: Math.max(0, agents.length - 3),
    };
  });
}
