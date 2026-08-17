import { db } from "@/lib/db";
import { mapSplashUrl } from "@/lib/maps";
import {
  computeOverview,
  computeAgentMeta,
  computeMapPool,
  computeMarginBuckets,
  MIN_MAPS_FOR_AVG,
  type TournamentOverview,
  type AgentPick,
  type MapPoolEntry,
  type MarginBucket,
} from "@/lib/tournament-stats-core";

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
  kills: number;
  deaths: number;
  assists: number;
  acs: number;
  kd: number;
  rating: number;
  kast: number;
  firstKills: number;
  firstDeaths: number;
};

/**
 * Clutchs et multikills du tournoi. À part du reste : seules les cartes
 * importées depuis leur ajout les portent, et l'affichage doit pouvoir dire
 * « données partielles » sans confondre absence et zéro.
 */
export type HighlightStats = {
  /** Au moins une carte du tournoi porte ces données. */
  hasData: boolean;
  /** Cartes avec scoreboard mais sans ces données (imports antérieurs). */
  missingMaps: number;
  biggestClutch: StatRecord;
  clutches: StatLeaderboard;
  multikills: StatLeaderboard;
  aces: StatLeaderboard;
};

export type TournamentStats = {
  tournamentRecords: TournamentFact[]; // records du tournoi (perso, map, partie…)
  records: StatRecord[]; // exploit sur une seule game (top 1, visuel)
  averages: StatRecord[]; // meilleures moyennes du tournoi (top 1, visuel)
  totals: StatLeaderboard[]; // cumuls du tournoi (top 3)
  players: PlayerPoint[]; // agregats par joueur, pour les graphiques
  overview: TournamentOverview; // chiffres d'ensemble (tuiles)
  agentMeta: AgentPick[]; // popularité des persos
  mapPool: MapPoolEntry[]; // fréquence et physionomie par carte
  margins: MarginBucket[]; // répartition des écarts de score
  highlights: HighlightStats; // clutchs et multikills
  hasData: boolean;
};

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
  // Sommés sur les seules cartes qui les portent (null = import antérieur).
  triples: number;
  quadras: number;
  aces: number;
  clutchWins: number;
  clutchAttempts: number;
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
      overview: computeOverview([], []),
      agentMeta: [],
      mapPool: [],
      margins: [],
      highlights: {
        hasData: false,
        missingMaps: 0,
        biggestClutch: { key: "biggest-clutch", label: "Plus gros clutch", entry: null },
        clutches: { key: "clutchs", label: "Clutchs gagnés", entries: [] },
        multikills: { key: "multikills", label: "Multikills", entries: [] },
        aces: { key: "aces", label: "Aces", entries: [] },
      },
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
      triples: 0,
      quadras: 0,
      aces: 0,
      clutchWins: 0,
      clutchAttempts: 0,
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
    a.triples += r.triples ?? 0;
    a.quadras += r.quadras ?? 0;
    a.aces += r.aces ?? 0;
    a.clutchWins += r.clutchWins ?? 0;
    a.clutchAttempts += r.clutchAttempts ?? 0;
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

  // --- Clutchs et multikills : distinguer « aucun » de « donnée absente » ---
  const covered = resolved.filter((r) => r.triples != null);
  const missingMaps = new Set(resolved.filter((r) => r.triples == null).map((r) => r.matchMapId))
    .size;

  let bestClutchRow: (typeof covered)[number] | null = null;
  for (const r of covered) {
    if ((r.bestClutch ?? 0) > (bestClutchRow?.bestClutch ?? 0)) bestClutchRow = r;
  }

  /** Classement filtré aux joueurs qui ont la stat : un top 3 à zéro n'apprend rien. */
  const highlightBoard = (
    key: string,
    label: string,
    value: (a: Agg) => number,
    detail: (a: Agg) => string | undefined
  ): StatLeaderboard => ({
    key,
    label,
    entries: players
      .filter((a) => value(a) > 0)
      .sort((x, y) => value(y) - value(x))
      .slice(0, TOP_N)
      .map((a) => ({ ...toEntry(a, `${value(a)}`, value(a)), detail: detail(a) })),
  });

  // Somme non pondérée, assumée : pondérer un ace face à un triple reviendrait
  // à inventer un barème, et le détail 3K/4K/ACE est affiché avec l'entrée.
  const mkTotal = (a: Agg) => a.triples + a.quadras + a.aces;
  const mkDetail = (a: Agg) =>
    [
      a.triples > 0 ? `${a.triples}×3K` : null,
      a.quadras > 0 ? `${a.quadras}×4K` : null,
      a.aces > 0 ? `${a.aces}×ACE` : null,
    ]
      .filter(Boolean)
      .join(" · ") || undefined;

  const highlights: HighlightStats = {
    hasData: covered.length > 0,
    missingMaps,
    biggestClutch: {
      key: "biggest-clutch",
      label: "Plus gros clutch",
      entry:
        bestClutchRow && (bestClutchRow.bestClutch ?? 0) > 0
          ? {
              playerId: bestClutchRow.player?.id ?? null,
              name: bestClutchRow.name,
              teamTag: bestClutchRow.teamTag,
              agent: bestClutchRow.agent,
              valueLabel: `1v${bestClutchRow.bestClutch}`,
              detail: `vs ${bestClutchRow.oppTag} · ${bestClutchRow.mapName}`,
            }
          : null,
    },
    clutches: highlightBoard(
      "clutchs",
      "Clutchs gagnés",
      (a) => a.clutchWins,
      (a) => `${a.clutchAttempts} tentative${a.clutchAttempts > 1 ? "s" : ""}`
    ),
    multikills: highlightBoard("multikills", "Multikills", mkTotal, mkDetail),
    aces: highlightBoard(
      "aces",
      "Aces",
      (a) => a.aces,
      () => undefined
    ),
  };

  const playerPoints: PlayerPoint[] = players.map((a) => ({
    playerId: a.playerId,
    name: a.name,
    teamTag: a.teamTag,
    maps: a.maps,
    kills: a.kills,
    deaths: a.deaths,
    assists: a.assists,
    acs: Math.round(a.acsSum / a.maps),
    kd: Math.round(kd(a) * 100) / 100,
    rating: Math.round((a.ratingSum / a.maps) * 100) / 100,
    kast: Math.round(a.kastSum / a.maps),
    firstKills: a.firstKills,
    firstDeaths: a.firstDeaths,
  }));

  return {
    tournamentRecords,
    records,
    averages,
    totals,
    players: playerPoints,
    overview: computeOverview(maps, resolved),
    agentMeta: computeAgentMeta(resolved.map((r) => r.agent)),
    mapPool: computeMapPool(maps),
    margins: computeMarginBuckets(maps),
    highlights,
    hasData: true,
  };
}
