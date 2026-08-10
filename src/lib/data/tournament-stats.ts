import { db } from "@/lib/db";
import { mapSplashUrl } from "@/lib/maps";

/** Formate une durée en secondes → « 42:15 ». */
function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Une ligne de classement / un record : un joueur et sa valeur formatée. */
export type StatEntry = {
  playerId: string | null;
  name: string;
  teamTag: string | null;
  agent?: string | null;
  valueLabel: string;
  /** Valeur brute, pour dimensionner une barre. Absente hors classements. */
  value?: number;
  detail?: string;
};

export type StatRecord = { key: string; label: string; entry: StatEntry | null };
export type StatLeaderboard = { key: string; label: string; entries: StatEntry[] };
/** Fait marquant du tournoi (perso / map / partie), pas rattaché à un joueur. */
export type TournamentFact = {
  key: string;
  label: string;
  value: string;
  detail?: string;
  agent?: string | null;
  image?: string | null;
};

/** Un joueur du tournoi, agrege. Sert aux graphiques (nuage, duels d'entree). */
export type PlayerPoint = {
  playerId: string | null;
  name: string;
  teamTag: string | null;
  maps: number;
  acs: number;
  kd: number;
  rating: number;
  kast: number;
  firstKills: number;
  firstDeaths: number;
};

export type TournamentStats = {
  tournamentRecords: TournamentFact[]; // records du tournoi (perso, map, partie…)
  records: StatRecord[]; // exploit sur une seule game (top 1, visuel)
  averages: StatRecord[]; // meilleures moyennes du tournoi (top 1, visuel)
  totals: StatLeaderboard[]; // cumuls du tournoi (top 3)
  players: PlayerPoint[]; // agregats par joueur, pour les graphiques
  hasData: boolean;
};

/** Nombre minimum de cartes jouées pour figurer dans les classements de moyenne. */
const MIN_MAPS_FOR_AVG = 2;
/** Nombre d'entrées affichées par classement cumulé. */
const TOP_N = 3;

type Agg = {
  playerId: string | null;
  name: string;
  teamTag: string | null;
  maps: number;
  kills: number;
  deaths: number;
  assists: number;
  firstKills: number;
  firstDeaths: number;
  acsSum: number;
  ratingSum: number;
  kastSum: number;
  hsSum: number;
  agents: Set<string>;
};

/**
 * Agrège toutes les stats par carte d'un tournoi : records (une game),
 * meilleures moyennes, cumuls et persos les plus joués. Un aller-retour DB.
 */
export async function getTournamentStats(tournamentId: string): Promise<TournamentStats> {
  const [rows, maps] = await Promise.all([
    db.playerGameStat.findMany({
      where: { matchMap: { match: { tournamentId } } },
      include: {
        player: { select: { id: true, pseudo: true } },
        matchMap: {
          select: {
            mapName: true,
            match: {
              select: {
                teamA: { select: { tag: true } },
                teamB: { select: { tag: true } },
              },
            },
          },
        },
      },
    }),
    db.matchMap.findMany({
      where: { match: { tournamentId } },
      select: {
        mapName: true,
        scoreA: true,
        scoreB: true,
        durationSec: true,
        match: {
          select: {
            teamA: { select: { tag: true } },
            teamB: { select: { tag: true } },
          },
        },
      },
    }),
  ]);

  if (rows.length === 0) {
    return {
      tournamentRecords: [],
      records: [],
      averages: [],
      totals: [],
      players: [],
      hasData: false,
    };
  }

  // Contexte par ligne : équipe du joueur et adversaire (selon le côté A/B).
  const resolved = rows.map((r) => {
    const teamTag = r.teamSide === "A" ? r.matchMap.match.teamA.tag : r.matchMap.match.teamB.tag;
    const oppTag = r.teamSide === "A" ? r.matchMap.match.teamB.tag : r.matchMap.match.teamA.tag;
    return {
      ...r,
      name: r.player?.pseudo ?? r.riotName,
      teamTag,
      oppTag,
      mapName: r.matchMap.mapName,
    };
  });

  // --- Records sur une seule game (avec l'agent joué ce match) ---
  const record = (
    label: string,
    pick: (r: (typeof resolved)[number]) => number,
    fmt: (v: number) => string
  ): StatRecord => {
    let best = resolved[0];
    for (const r of resolved) if (pick(r) > pick(best)) best = r;
    return {
      key: label,
      label,
      entry: {
        playerId: best.player?.id ?? null,
        name: best.name,
        teamTag: best.teamTag,
        agent: best.agent,
        valueLabel: fmt(pick(best)),
        detail: `vs ${best.oppTag} · ${best.mapName}`,
      },
    };
  };

  const records: StatRecord[] = [
    record(
      "Plus de kills (game)",
      (r) => r.kills,
      (v) => `${v}`
    ),
    record(
      "Plus d'assists (game)",
      (r) => r.assists,
      (v) => `${v}`
    ),
    record(
      "Plus de morts (game)",
      (r) => r.deaths,
      (v) => `${v}`
    ),
    record(
      "Meilleur ACS (game)",
      (r) => r.acs,
      (v) => `${v}`
    ),
    record(
      "Plus de first kills (game)",
      (r) => r.firstKills,
      (v) => `${v}`
    ),
    record(
      "Plus de first deaths (game)",
      (r) => r.firstDeaths,
      (v) => `${v}`
    ),
  ];

  // --- Records du tournoi : perso le plus joué, map la plus jouée, partie la plus longue ---
  const agentCount = new Map<string, number>();
  for (const r of resolved) {
    if (r.agent) agentCount.set(r.agent, (agentCount.get(r.agent) ?? 0) + 1);
  }
  const topAgent = [...agentCount.entries()].sort((a, b) => b[1] - a[1])[0];

  const mapCount = new Map<string, number>();
  for (const m of maps) mapCount.set(m.mapName, (mapCount.get(m.mapName) ?? 0) + 1);
  const topMap = [...mapCount.entries()].sort((a, b) => b[1] - a[1])[0];

  // Partie la plus longue = plus grande durée (en temps), pas en rounds.
  let longest = maps.length > 0 ? maps[0] : null;
  for (const m of maps) {
    if (longest && (m.durationSec ?? 0) > (longest.durationSec ?? 0)) longest = m;
  }

  const tournamentRecords: TournamentFact[] = [];
  if (topAgent) {
    tournamentRecords.push({
      key: "top-agent",
      label: "Perso le plus joué",
      value: topAgent[0],
      detail: `${topAgent[1]} parties`,
      agent: topAgent[0],
    });
  }
  if (topMap) {
    tournamentRecords.push({
      key: "top-map",
      label: "Map la plus jouée",
      value: topMap[0],
      detail: `${topMap[1]} fois`,
      image: mapSplashUrl(topMap[0]) ?? null,
    });
  }
  if (longest && longest.durationSec != null) {
    tournamentRecords.push({
      key: "longest-game",
      label: "Partie la plus longue",
      value: fmtDuration(longest.durationSec),
      detail: `${longest.match.teamA.tag} ${longest.scoreA} - ${longest.scoreB} ${longest.match.teamB.tag} · ${longest.mapName}`,
    });
  }

  // --- Agrégats par joueur (clé = playerId sinon riotName#tag) ---
  const byPlayer = new Map<string, Agg>();
  for (const r of resolved) {
    const key = r.player?.id ?? `${r.riotName}#${r.riotTag ?? ""}`;
    const a = byPlayer.get(key) ?? {
      playerId: r.player?.id ?? null,
      name: r.name,
      teamTag: r.teamTag,
      maps: 0,
      kills: 0,
      deaths: 0,
      assists: 0,
      firstKills: 0,
      firstDeaths: 0,
      acsSum: 0,
      ratingSum: 0,
      kastSum: 0,
      hsSum: 0,
      agents: new Set<string>(),
    };
    a.maps += 1;
    a.kills += r.kills;
    a.deaths += r.deaths;
    a.assists += r.assists;
    a.firstKills += r.firstKills;
    a.firstDeaths += r.firstDeaths;
    if (r.agent) a.agents.add(r.agent);
    a.acsSum += r.acs;
    a.ratingSum += r.rating;
    a.kastSum += r.kast;
    a.hsSum += r.hsPct;
    byPlayer.set(key, a);
  }
  const players = [...byPlayer.values()];

  const toEntry = (a: Agg, valueLabel: string, value?: number): StatEntry => ({
    playerId: a.playerId,
    name: a.name,
    teamTag: a.teamTag,
    valueLabel,
    value,
    detail: `${a.maps} carte${a.maps > 1 ? "s" : ""}`,
  });

  // Meilleure moyenne : uniquement le top 1 (min. MIN_MAPS_FOR_AVG cartes).
  const avgRecord = (
    label: string,
    value: (a: Agg) => number,
    fmt: (v: number) => string
  ): StatRecord => {
    const qualified = players.filter((a) => a.maps >= MIN_MAPS_FOR_AVG);
    const pool = qualified.length > 0 ? qualified : players;
    if (pool.length === 0) return { key: label, label, entry: null };
    let best = pool[0];
    for (const a of pool) if (value(a) > value(best)) best = a;
    return { key: label, label, entry: toEntry(best, fmt(value(best))) };
  };

  const kd = (a: Agg) => (a.deaths > 0 ? a.kills / a.deaths : a.kills);

  const averages: StatRecord[] = [
    avgRecord("Meilleur K/D", kd, (v) => v.toFixed(2)),
    avgRecord(
      "Meilleur rating",
      (a) => a.ratingSum / a.maps,
      (v) => v.toFixed(2)
    ),
    avgRecord(
      "Meilleur ACS",
      (a) => a.acsSum / a.maps,
      (v) => `${Math.round(v)}`
    ),
    avgRecord(
      "Meilleur HS%",
      (a) => a.hsSum / a.maps,
      (v) => `${Math.round(v)}%`
    ),
    avgRecord(
      "Meilleur KAST",
      (a) => a.kastSum / a.maps,
      (v) => `${Math.round(v)}%`
    ),
  ];

  // Cumul : top 3, aucun seuil de cartes.
  const totalBoard = (
    label: string,
    value: (a: Agg) => number,
    fmt: (v: number) => string
  ): StatLeaderboard => ({
    key: label,
    label,
    entries: [...players]
      .sort((x, y) => value(y) - value(x))
      .slice(0, TOP_N)
      .map((a) => toEntry(a, fmt(value(a)), value(a))),
  });

  const totals: StatLeaderboard[] = [
    totalBoard(
      "Plus de kills (total)",
      (a) => a.kills,
      (v) => `${v}`
    ),
    totalBoard(
      "Plus d'assists (total)",
      (a) => a.assists,
      (v) => `${v}`
    ),
    totalBoard(
      "Plus de morts (total)",
      (a) => a.deaths,
      (v) => `${v}`
    ),
    totalBoard(
      "Plus de first kills (total)",
      (a) => a.firstKills,
      (v) => `${v}`
    ),
    totalBoard(
      "Plus de first deaths (total)",
      (a) => a.firstDeaths,
      (v) => `${v}`
    ),
    totalBoard(
      "Joueur le plus flex",
      (a) => a.agents.size,
      (v) => `${v} perso${v > 1 ? "s" : ""}`
    ),
  ];

  const playerPoints: PlayerPoint[] = players.map((a) => ({
    playerId: a.playerId,
    name: a.name,
    teamTag: a.teamTag,
    maps: a.maps,
    acs: Math.round(a.acsSum / a.maps),
    kd: Math.round(kd(a) * 100) / 100,
    rating: Math.round((a.ratingSum / a.maps) * 100) / 100,
    kast: Math.round(a.kastSum / a.maps),
    firstKills: a.firstKills,
    firstDeaths: a.firstDeaths,
  }));

  return { tournamentRecords, records, averages, totals, players: playerPoints, hasData: true };
}
