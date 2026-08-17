/**
 * Agrégations d'ensemble d'un tournoi : chiffres globaux, méta des persos,
 * pool de cartes et physionomie des scores. Module pur : il ne connaît que des
 * lignes à plat, donc il se teste sans base et survit à un changement de source.
 */

/** Une carte jouée, vue sans son match : scores et durée suffisent ici. */
export type MapLine = {
  mapName: string;
  scoreA: number;
  scoreB: number;
  durationSec: number | null;
};

export type TournamentOverview = {
  mapsPlayed: number;
  rounds: number;
  kills: number;
  otMaps: number;
  durationSec: number;
};

export type AgentPick = { agent: string; picks: number; pct: number };

export type MapPoolEntry = {
  mapName: string;
  played: number;
  otCount: number;
  avgMargin: number;
};

export type MarginBucket = { key: string; label: string; range: string; count: number };

/**
 * Cartes minimum pour figurer dans un classement de moyenne (meilleures
 * moyennes comme tableau des joueurs) : une seule game ne fait pas un niveau,
 * et deux seuils séparés avaient fini par ne plus être le même seuil.
 */
export const MIN_MAPS_FOR_AVG = 2;

/** Un score au-delà de 13 ne s'atteint qu'en prolongation. */
const isOvertime = (m: MapLine) => Math.max(m.scoreA, m.scoreB) > 13;
const margin = (m: MapLine) => Math.abs(m.scoreA - m.scoreB);

/** Chiffres d'ensemble : le tournoi résumé en une rangée de tuiles. */
export function computeOverview(
  maps: readonly MapLine[],
  rows: readonly { kills: number }[]
): TournamentOverview {
  return {
    mapsPlayed: maps.length,
    rounds: maps.reduce((n, m) => n + m.scoreA + m.scoreB, 0),
    kills: rows.reduce((n, r) => n + r.kills, 0),
    otMaps: maps.filter(isOvertime).length,
    durationSec: maps.reduce((n, m) => n + (m.durationSec ?? 0), 0),
  };
}

/**
 * Popularité des persos sur l'ensemble des cartes. La part est rapportée aux
 * picks connus, pas aux lignes : un scoreboard sans agent (import ancien) ne
 * doit pas diluer le pourcentage des autres.
 */
export function computeAgentMeta(agents: readonly (string | null)[]): AgentPick[] {
  const counts = new Map<string, number>();
  for (const a of agents) {
    if (a) counts.set(a, (counts.get(a) ?? 0) + 1);
  }
  const total = [...counts.values()].reduce((n, c) => n + c, 0);
  if (total === 0) return [];
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([agent, picks]) => ({ agent, picks, pct: Math.round((picks / total) * 100) }));
}

/** Bilan par carte du pool : fréquence, prolongations, écart moyen de rounds. */
export function computeMapPool(maps: readonly MapLine[]): MapPoolEntry[] {
  const byMap = new Map<string, MapLine[]>();
  for (const m of maps) {
    byMap.set(m.mapName, [...(byMap.get(m.mapName) ?? []), m]);
  }
  return [...byMap.entries()]
    .map(([mapName, played]) => ({
      mapName,
      played: played.length,
      otCount: played.filter(isOvertime).length,
      avgMargin: Math.round((played.reduce((n, m) => n + margin(m), 0) / played.length) * 10) / 10,
    }))
    .sort((a, b) => b.played - a.played);
}

/**
 * Tranches d'écart, du plus serré au plus large. L'ordre est celui de
 * l'affichage : c'est une échelle, pas des catégories nominales. Le libellé et
 * la plage sont séparés : la plage s'affiche en note, sinon elle tronquait.
 */
export const MARGIN_BUCKETS: readonly { key: string; label: string; range: string; max: number }[] =
  [
    { key: "tight", label: "Sur le fil", range: "≤ 2 rounds", max: 2 },
    { key: "contested", label: "Disputée", range: "3–5 rounds", max: 5 },
    { key: "clear", label: "Nette", range: "6–9 rounds", max: 9 },
    { key: "onesided", label: "À sens unique", range: "≥ 10 rounds", max: Infinity },
  ];

/** Ventile chaque carte jouée dans sa tranche d'écart de score. */
export function computeMarginBuckets(maps: readonly MapLine[]): MarginBucket[] {
  return MARGIN_BUCKETS.map((bucket, i) => {
    const min = i === 0 ? 0 : MARGIN_BUCKETS[i - 1].max + 1;
    return {
      key: bucket.key,
      label: bucket.label,
      range: bucket.range,
      count: maps.filter((m) => margin(m) >= min && margin(m) <= bucket.max).length,
    };
  });
}
