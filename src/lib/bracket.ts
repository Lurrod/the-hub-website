export type BracketMatchData = {
  id: string;
  round: string | null;
  teamAId: string;
  teamBId: string;
  scoreA: number;
  scoreB: number;
  winnerId: string | null;
  position?: number | null;
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

export type BracketRound = { name: string; matches: BracketMatchData[] };
export type BracketSection = { key: string; title: string; rounds: BracketRound[] };

const SECTION_ORDER = ["single", "upper", "lower", "final"];
const SECTION_TITLE: Record<string, string> = {
  single: "",
  upper: "Upper Bracket",
  lower: "Lower Bracket",
  final: "Grande Finale",
};

/**
 * Déduit la section (upper/lower/finale/simple) et le libellé de round depuis le
 * nom saisi. Reconnaît les préfixes UB/LB/Upper/Lower/Winners/Losers et les
 * grandes finales, de façon à supporter simple élim, double élim, swiss, etc.
 */
export function parseRound(round: string | null): { section: string; label: string } {
  const r = (round ?? "Bracket").trim();
  const low = r.toLowerCase();
  if (/grande?\s*finale|grand\s*final/.test(low)) return { section: "final", label: r };
  if (/^(lb|lower|losers?)\b/.test(low) || /\b(lower\s*bracket|losers?\s*bracket)\b/.test(low)) {
    const label = r.replace(/^lb\s*[-:·]?\s*/i, "").replace(/lower\s*bracket\s*[-:·]?\s*/i, "").trim();
    return { section: "lower", label: label || r };
  }
  if (/^(ub|upper|winners?)\b/.test(low) || /\b(upper\s*bracket|winners?\s*bracket)\b/.test(low)) {
    const label = r.replace(/^ub\s*[-:·]?\s*/i, "").replace(/upper\s*bracket\s*[-:·]?\s*/i, "").trim();
    return { section: "upper", label: label || r };
  }
  return { section: "single", label: r };
}

function roundRank(name: string): number {
  const i = ROUND_ORDER.indexOf(name);
  return i === -1 ? 500 : i;
}

/**
 * Regroupe les matchs en sections (upper / lower / grande finale) puis en rounds
 * ordonnés. Rendu en colonnes indépendantes par section - robuste pour TOUT
 * format (simple élim, double élim, swiss, poule unique…), sans supposer un
 * arbre binaire parfait (ce qui cassait avec un lower bracket).
 */
export function orderBracketSections(matches: BracketMatchData[]): BracketSection[] {
  const bySection = new Map<string, Map<string, BracketMatchData[]>>();
  for (const m of matches) {
    const { section, label } = parseRound(m.round);
    if (!bySection.has(section)) bySection.set(section, new Map());
    const rounds = bySection.get(section)!;
    const list = rounds.get(label) ?? [];
    list.push(m);
    rounds.set(label, list);
  }
  return [...bySection.entries()]
    .sort((a, b) => SECTION_ORDER.indexOf(a[0]) - SECTION_ORDER.indexOf(b[0]))
    .map(([key, rounds]) => ({
      key,
      title: SECTION_TITLE[key] ?? "",
      rounds: [...rounds.entries()]
        .map(([name, ms]) => ({ name, matches: [...ms].sort((a, b) => a.id.localeCompare(b.id)) }))
        // Ordre des rounds : par bracketPosition (fiable pour le lower bracket),
        // puis nombre de matchs, puis l'ordre connu des rounds.
        .sort((a, b) => {
          const pa = Math.min(...a.matches.map((m) => m.position ?? 9999));
          const pb = Math.min(...b.matches.map((m) => m.position ?? 9999));
          return pa - pb || b.matches.length - a.matches.length || roundRank(a.name) - roundRank(b.name);
        }),
    }));
}
