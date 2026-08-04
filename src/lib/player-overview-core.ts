/**
 * Agrégations de l'aperçu d'un joueur. Module pur : il ne connaît que des lignes
 * « une carte jouée », ce qui le rend testable sans base et réutilisable si la
 * source des stats change.
 */

/** Une carte jouée par le joueur, à plat. */
export type PlayerStatRow = {
  matchId: string;
  mapName: string;
  date: Date | null;
  agent: string | null;
  kills: number;
  deaths: number;
  assists: number;
  acs: number;
  adr: number;
  hsPct: number;
  kast: number;
  rating: number;
  firstKills: number;
  firstDeaths: number;
  win: boolean;
  opponentTag: string | null;
};

export type AgentShare = { agent: string; maps: number; pct: number };
export type MapRecord = { mapName: string; maps: number; wins: number; winratePct: number };
export type TrendPoint = { matchId: string; label: string; rating: number; win: boolean };
export type BestGame = {
  matchId: string;
  kills: number;
  deaths: number;
  assists: number;
  mapName: string;
  agent: string | null;
  opponentTag: string | null;
};

export type PlayerOverview = {
  maps: number;
  kills: number;
  deaths: number;
  kd: number;
  topAgent: AgentShare | null;
  bestGame: BestGame | null;
  agents: AgentShare[];
  /** Reste des agents au-delà des 6 premiers, pour que le disque fasse 100 %. */
  agentsOther: AgentShare | null;
  mapRecords: MapRecord[];
  trend: TrendPoint[];
  avgRating: number;
  avgAcs: number;
  avgKast: number;
  avgHs: number;
  firstKills: number;
  firstDeaths: number;
};

const round2 = (v: number) => Math.round(v * 100) / 100;

/** Moyenne entière d'un champ, 0 sur un ensemble vide. */
function avg(rows: readonly PlayerStatRow[], pick: (r: PlayerStatRow) => number): number {
  if (rows.length === 0) return 0;
  return rows.reduce((n, r) => n + pick(r), 0) / rows.length;
}

/**
 * Parts d'agents, du plus joué au moins joué. Les cartes sans agent renseigné
 * sont ignorées : elles fausseraient les pourcentages sans rien apprendre.
 */
export function agentShares(rows: readonly PlayerStatRow[]): AgentShare[] {
  const played = rows.filter((r) => r.agent);
  const counts = new Map<string, number>();
  for (const r of played) counts.set(r.agent!, (counts.get(r.agent!) ?? 0) + 1);
  return [...counts.entries()]
    .map(([agent, maps]) => ({
      agent,
      maps,
      pct: played.length > 0 ? Math.round((maps / played.length) * 100) : 0,
    }))
    .sort((a, b) => b.maps - a.maps || a.agent.localeCompare(b.agent));
}

/** Bilan par map, des plus jouées aux moins jouées. */
export function mapRecords(rows: readonly PlayerStatRow[]): MapRecord[] {
  const byMap = new Map<string, { maps: number; wins: number }>();
  for (const r of rows) {
    const e = byMap.get(r.mapName) ?? { maps: 0, wins: 0 };
    e.maps += 1;
    if (r.win) e.wins += 1;
    byMap.set(r.mapName, e);
  }
  return [...byMap.entries()]
    .map(([mapName, e]) => ({
      mapName,
      maps: e.maps,
      wins: e.wins,
      winratePct: Math.round((e.wins / e.maps) * 100),
    }))
    .sort((a, b) => b.maps - a.maps || a.mapName.localeCompare(b.mapName));
}

/**
 * Meilleure partie au nombre de kills. À égalité, la carte au meilleur rating
 * départage — sinon l'ordre dépendrait de celui de la requête.
 */
export function bestGame(rows: readonly PlayerStatRow[]): BestGame | null {
  if (rows.length === 0) return null;
  const best = rows.reduce((a, b) =>
    b.kills > a.kills || (b.kills === a.kills && b.rating > a.rating) ? b : a
  );
  return {
    matchId: best.matchId,
    kills: best.kills,
    deaths: best.deaths,
    assists: best.assists,
    mapName: best.mapName,
    agent: best.agent,
    opponentTag: best.opponentTag,
  };
}

/**
 * Ratings des `limit` dernières cartes, en ordre chronologique pour la courbe.
 * `rows` arrive du plus récent au plus ancien (ordre de la requête).
 */
export function ratingTrend(rows: readonly PlayerStatRow[], limit = 15): TrendPoint[] {
  return rows
    .slice(0, limit)
    .map((r) => ({
      matchId: r.matchId,
      label: r.opponentTag ? `${r.mapName} vs ${r.opponentTag}` : r.mapName,
      rating: r.rating,
      win: r.win,
    }))
    .reverse();
}

export function buildPlayerOverview(rows: readonly PlayerStatRow[]): PlayerOverview {
  const kills = rows.reduce((n, r) => n + r.kills, 0);
  const deaths = rows.reduce((n, r) => n + r.deaths, 0);
  const agents = agentShares(rows);
  const tail = agents.slice(6);
  const agentsOther =
    tail.length > 0
      ? {
          agent: "Autres",
          maps: tail.reduce((n, a) => n + a.maps, 0),
          pct: tail.reduce((n, a) => n + a.pct, 0),
        }
      : null;
  return {
    maps: rows.length,
    kills,
    deaths,
    // Sans aucune mort, le ratio vaut le nombre de kills : diviser par zéro
    // donnerait l'infini et casserait l'affichage.
    kd: deaths > 0 ? round2(kills / deaths) : round2(kills),
    topAgent: agents[0] ?? null,
    bestGame: bestGame(rows),
    agents: agents.slice(0, 6),
    agentsOther,
    mapRecords: mapRecords(rows),
    trend: ratingTrend(rows),
    avgRating: round2(avg(rows, (r) => r.rating)),
    avgAcs: Math.round(avg(rows, (r) => r.acs)),
    avgKast: Math.round(avg(rows, (r) => r.kast)),
    avgHs: Math.round(avg(rows, (r) => r.hsPct)),
    firstKills: rows.reduce((n, r) => n + r.firstKills, 0),
    firstDeaths: rows.reduce((n, r) => n + r.firstDeaths, 0),
  };
}
