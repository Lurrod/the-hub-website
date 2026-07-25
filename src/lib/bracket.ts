export type BracketMatchData = {
  id: string;
  round: string | null;
  teamAId: string;
  teamBId: string;
  scoreA: number;
  scoreB: number;
  winnerId: string | null;
  teamA: { tag: string } | null;
  teamB: { tag: string } | null;
};

const ROUND_ORDER = [
  "Huitièmes de finale",
  "Huitièmes",
  "Quarts de finale",
  "Quarts",
  "Demi-finales",
  "Demi-finale",
  "Finale",
  "Grande finale",
];

export function orderBracketRounds(
  matches: BracketMatchData[]
): { name: string; matches: BracketMatchData[] }[] {
  const byRound = new Map<string, BracketMatchData[]>();
  for (const m of matches) {
    const key = m.round ?? "Bracket";
    const list = byRound.get(key) ?? [];
    list.push(m);
    byRound.set(key, list);
  }
  return [...byRound.entries()]
    .map(([name, ms]) => ({
      name,
      matches: [...ms].sort((a, b) => a.id.localeCompare(b.id)),
    }))
    .sort((a, b) => {
      const ia = ROUND_ORDER.indexOf(a.name);
      const ib = ROUND_ORDER.indexOf(b.name);
      const oa = ia === -1 ? 500 : ia;
      const ob = ib === -1 ? 500 : ib;
      return oa - ob || b.matches.length - a.matches.length || a.name.localeCompare(b.name);
    });
}
