/**
 * Agrégations par équipe sur un tournoi. Module pur : il ne connaît que des
 * lignes à plat, donc il se teste sans base et survit à un changement de source.
 */

/** Un round vu du côté d'une équipe. */
export type TeamRound = {
  won: boolean;
  outcome: string;
  /** Vrai si l'équipe attaquait, null quand la donnée manque (import ancien). */
  attacking: boolean | null;
  /** Valeur d'équipement de l'équipe puis de l'adversaire, null si absente. */
  loadout: number | null;
  oppLoadout: number | null;
};

/** Une carte jouée par une équipe. */
export type TeamMapEntry = {
  teamId: string;
  matchId: string;
  mapName: string;
  roundsFor: number;
  roundsAgainst: number;
  won: boolean;
  rounds: TeamRound[];
};

/** Un match joué par une équipe, dans l'ordre chronologique. */
export type TeamMatchEntry = { teamId: string; matchId: string; won: boolean };

/** Cumul d'un joueur sur le tournoi, rattaché à son équipe. */
export type TeamPlayerEntry = {
  teamId: string;
  playerId: string | null;
  name: string;
  nationality: string | null;
  maps: number;
  kills: number;
  deaths: number;
  assists: number;
  acsSum: number;
  ratingSum: number;
  firstKills: number;
  firstDeaths: number;
  agents: string[];
};

export type TeamIdentity = {
  id: string;
  name: string;
  tag: string;
  logo: string | null;
};

export type MapRecord = { mapName: string; played: number; won: number; winratePct: number };
export type AgentCount = { agent: string; maps: number };
export type PlayerLine = {
  playerId: string | null;
  name: string;
  nationality: string | null;
  maps: number;
  kills: number;
  deaths: number;
  acs: number;
  rating: number;
  killShare: number;
};

export type SideRecord = { played: number; won: number; winratePct: number };

export type TeamStats = {
  team: TeamIdentity;
  matchesPlayed: number;
  matchesWon: number;
  mapsPlayed: number;
  mapsWon: number;
  roundsFor: number;
  roundsAgainst: number;
  roundDiff: number;
  /** Résultats des matchs, du plus ancien au plus récent. */
  form: boolean[];
  avgRating: number;
  avgAcs: number;
  firstKills: number;
  firstDeaths: number;
  maps: MapRecord[];
  agents: AgentCount[];
  players: PlayerLine[];
  /** Rounds gagnés par type de fin. */
  outcomes: Record<string, number>;
  attack: SideRecord;
  defense: SideRecord;
  pistols: SideRecord;
  /** Rounds gagnés avec au moins 4000 d'équipement de moins que l'adversaire. */
  ecoWins: number;
  ecoPlayed: number;
  longestStreak: number;
  /** Plus gros retard comblé sur une carte finalement gagnée. */
  biggestComeback: number;
};

const pct = (won: number, played: number) => (played > 0 ? Math.round((won / played) * 100) : 0);
const round2 = (v: number) => Math.round(v * 100) / 100;

/** Écart d'équipement à partir duquel un round gagné compte comme un eco. */
const ECO_GAP = 4000;
/** Index des rounds de pistolet : premier de chaque mi-temps réglementaire. */
const PISTOL_ROUNDS = new Set([0, 12]);

/**
 * Plus longue série de rounds consécutifs gagnés, toutes cartes confondues mais
 * sans jamais enjamber deux cartes : une série ne traverse pas une fin de map.
 */
export function longestStreak(maps: readonly TeamMapEntry[]): number {
  let best = 0;
  for (const m of maps) {
    let run = 0;
    for (const r of m.rounds) {
      run = r.won ? run + 1 : 0;
      if (run > best) best = run;
    }
  }
  return best;
}

/**
 * Plus gros retard comblé : on rejoue la carte round par round, on note le pire
 * écart traversé, et on ne le retient que si la carte a finalement été gagnée.
 */
export function biggestComeback(maps: readonly TeamMapEntry[]): number {
  let best = 0;
  for (const m of maps) {
    if (!m.won) continue;
    let f = 0;
    let a = 0;
    let worst = 0;
    for (const r of m.rounds) {
      if (r.won) f += 1;
      else a += 1;
      if (a - f > worst) worst = a - f;
    }
    if (worst > best) best = worst;
  }
  return best;
}

export function buildTeamStats(
  identity: TeamIdentity,
  matches: readonly TeamMatchEntry[],
  maps: readonly TeamMapEntry[],
  players: readonly TeamPlayerEntry[]
): TeamStats {
  const roundsFor = maps.reduce((n, m) => n + m.roundsFor, 0);
  const roundsAgainst = maps.reduce((n, m) => n + m.roundsAgainst, 0);

  const byMap = new Map<string, { played: number; won: number }>();
  for (const m of maps) {
    const e = byMap.get(m.mapName) ?? { played: 0, won: 0 };
    e.played += 1;
    if (m.won) e.won += 1;
    byMap.set(m.mapName, e);
  }

  const outcomes: Record<string, number> = {};
  const attack = { played: 0, won: 0 };
  const defense = { played: 0, won: 0 };
  const pistols = { played: 0, won: 0 };
  let ecoWins = 0;
  let ecoPlayed = 0;

  for (const m of maps) {
    m.rounds.forEach((r, i) => {
      if (r.won) outcomes[r.outcome] = (outcomes[r.outcome] ?? 0) + 1;
      if (r.attacking === true) {
        attack.played += 1;
        if (r.won) attack.won += 1;
      } else if (r.attacking === false) {
        defense.played += 1;
        if (r.won) defense.won += 1;
      }
      if (PISTOL_ROUNDS.has(i)) {
        pistols.played += 1;
        if (r.won) pistols.won += 1;
      }
      if (r.loadout != null && r.oppLoadout != null && r.oppLoadout - r.loadout >= ECO_GAP) {
        ecoPlayed += 1;
        if (r.won) ecoWins += 1;
      }
    });
  }

  const agentCounts = new Map<string, number>();
  for (const p of players) {
    for (const a of p.agents) agentCounts.set(a, (agentCounts.get(a) ?? 0) + 1);
  }

  const teamKills = players.reduce((n, p) => n + p.kills, 0);
  const playerLines: PlayerLine[] = players
    .map((p) => ({
      playerId: p.playerId,
      name: p.name,
      nationality: p.nationality,
      maps: p.maps,
      kills: p.kills,
      deaths: p.deaths,
      acs: p.maps > 0 ? Math.round(p.acsSum / p.maps) : 0,
      rating: p.maps > 0 ? round2(p.ratingSum / p.maps) : 0,
      killShare: teamKills > 0 ? Math.round((p.kills / teamKills) * 100) : 0,
    }))
    .sort((a, b) => b.rating - a.rating || b.kills - a.kills);

  const mapsPlayedByPlayers = players.reduce((n, p) => n + p.maps, 0);

  return {
    team: identity,
    matchesPlayed: matches.length,
    matchesWon: matches.filter((m) => m.won).length,
    mapsPlayed: maps.length,
    mapsWon: maps.filter((m) => m.won).length,
    roundsFor,
    roundsAgainst,
    roundDiff: roundsFor - roundsAgainst,
    form: matches.map((m) => m.won),
    avgRating:
      mapsPlayedByPlayers > 0
        ? round2(players.reduce((n, p) => n + p.ratingSum, 0) / mapsPlayedByPlayers)
        : 0,
    avgAcs:
      mapsPlayedByPlayers > 0
        ? Math.round(players.reduce((n, p) => n + p.acsSum, 0) / mapsPlayedByPlayers)
        : 0,
    firstKills: players.reduce((n, p) => n + p.firstKills, 0),
    firstDeaths: players.reduce((n, p) => n + p.firstDeaths, 0),
    maps: [...byMap.entries()]
      .map(([mapName, e]) => ({
        mapName,
        played: e.played,
        won: e.won,
        winratePct: pct(e.won, e.played),
      }))
      .sort((a, b) => b.played - a.played || a.mapName.localeCompare(b.mapName)),
    agents: [...agentCounts.entries()]
      .map(([agent, m]) => ({ agent, maps: m }))
      .sort((a, b) => b.maps - a.maps || a.agent.localeCompare(b.agent)),
    players: playerLines,
    outcomes,
    attack: { ...attack, winratePct: pct(attack.won, attack.played) },
    defense: { ...defense, winratePct: pct(defense.won, defense.played) },
    pistols: { ...pistols, winratePct: pct(pistols.won, pistols.played) },
    ecoWins,
    ecoPlayed,
    longestStreak: longestStreak(maps),
    biggestComeback: biggestComeback(maps),
  };
}
