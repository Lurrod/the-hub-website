/**
 * Cumul des statistiques d'un joueur sur toutes les maps d'une rencontre.
 *
 * Module pur, sans dépendance à la base ni au rendu : il alimente l'onglet
 * « Toutes les maps » du scoreboard de la fiche match et la carte de partage
 * de la série.
 */
import { computeRating } from "@/lib/match-stats-core";

/**
 * Ligne de statistiques d'un joueur sur une map. La forme est celle de
 * `ScoreboardPlayerRow` du composant de scoreboard, décrite ici en structurel
 * pour qu'une bibliothèque n'ait pas à importer un composant client.
 */
export type SeriesInputRow = {
  id: string;
  playerId: string | null;
  pseudo: string | null;
  riotName: string;
  teamSide: string;
  agent: string | null;
  kills: number;
  deaths: number;
  assists: number;
  acs: number;
  adr: number;
  rating: number;
  kast: number;
  firstKills: number;
  firstDeaths: number;
};

/** Une map de la rencontre : sa longueur, et les lignes qu'elle porte. */
export type SeriesMap = {
  /** Nombre de rounds joués, soit la somme des deux scores. */
  rounds: number;
  stats: readonly SeriesInputRow[];
};

/** Ligne cumulée : la même forme, plus les agents joués et le nombre de maps. */
export type SeriesRow = SeriesInputRow & {
  /** Agents joués, du plus joué au moins joué. */
  agents: string[];
  /** Nombre de maps sur lesquelles ce joueur a des statistiques. */
  mapsPlayed: number;
  /** Rounds cumulés des maps que ce joueur a jouées. */
  rounds: number;
};

/**
 * Une ligne sans fiche joueur reste identifiable par son Riot ID : c'est le
 * seul repère stable d'un compte non rattaché, et deux maps de la même
 * rencontre doivent se regrouper dessus.
 */
function playerKey(row: SeriesInputRow): string {
  return row.playerId ?? row.riotName;
}

/** Une ligne et la longueur de la map sur laquelle elle a été jouée. */
type PlayedRow = { row: SeriesInputRow; rounds: number };

/**
 * Moyenne pondérée par les rounds.
 *
 * L'ACS, l'ADR et le KAST sont des grandeurs *par round* : les moyenner à
 * poids égaux reviendrait à faire compter une map de 17 rounds autant qu'une
 * map de 24, et à surévaluer la performance sur la plus courte.
 *
 * Le repli sur la moyenne simple couvre les maps sans round enregistré, où la
 * pondération n'aurait aucun sens et diviserait par zéro.
 */
function weightedAvg(played: readonly PlayedRow[], pick: (r: SeriesInputRow) => number): number {
  const rounds = played.reduce((n, p) => n + p.rounds, 0);
  if (rounds === 0) {
    return played.reduce((n, p) => n + pick(p.row), 0) / played.length;
  }
  return played.reduce((n, p) => n + pick(p.row) * p.rounds, 0) / rounds;
}

/**
 * Agents joués, du plus joué au moins joué, sans doublon. À égalité de maps,
 * l'ordre alphabétique : deux affichages successifs doivent aligner les
 * icônes dans le même ordre.
 */
function rankAgents(played: readonly PlayedRow[]): string[] {
  const counts = new Map<string, number>();
  for (const { row } of played) {
    if (row.agent) counts.set(row.agent, (counts.get(row.agent) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr"))
    .map(([agent]) => agent);
}

/**
 * Cumule les statistiques de chaque joueur sur l'ensemble des maps.
 *
 * Les compteurs s'additionnent (frags, assists, entrées). L'ACS, l'ADR et le
 * KAST se moyennent **pondérés par les rounds**, et le rating est **recalculé
 * sur les totaux de la série** plutôt que moyenné : c'est la seule valeur
 * cohérente avec les chiffres affichés à côté de lui. Moyenner les ratings de
 * map donnait jusqu'à 0,04 d'écart sur les données du site, en faveur des
 * joueurs ayant brillé sur une map courte.
 *
 * Tout ne porte que sur les **maps réellement jouées par ce joueur** : un
 * remplaçant entré sur une map ne doit pas voir sa moyenne diluée par celles
 * où il n'était pas là.
 */
export function aggregateSeries(maps: readonly SeriesMap[]): SeriesRow[] {
  const grouped = new Map<string, PlayedRow[]>();
  for (const { rounds, stats } of maps) {
    for (const row of stats) {
      const key = playerKey(row);
      const bucket = grouped.get(key);
      if (bucket) bucket.push({ row, rounds });
      else grouped.set(key, [{ row, rounds }]);
    }
  }

  return [...grouped.entries()].map(([key, played]) => {
    const agents = rankAgents(played);
    const rounds = played.reduce((n, p) => n + p.rounds, 0);
    const kills = played.reduce((n, p) => n + p.row.kills, 0);
    const deaths = played.reduce((n, p) => n + p.row.deaths, 0);
    const assists = played.reduce((n, p) => n + p.row.assists, 0);
    const kast = weightedAvg(played, (r) => r.kast);
    const adr = weightedAvg(played, (r) => r.adr);

    return {
      ...played[0].row,
      // L'identifiant ne peut pas être celui d'une ligne de map : il doit
      // rester le même quel que soit le nombre de maps agrégées, sans quoi
      // React remonterait la ligne à chaque changement d'onglet.
      id: `serie-${key}`,
      agents,
      agent: agents[0] ?? null,
      mapsPlayed: played.length,
      rounds,
      kills,
      deaths,
      assists,
      firstKills: played.reduce((n, p) => n + p.row.firstKills, 0),
      firstDeaths: played.reduce((n, p) => n + p.row.firstDeaths, 0),
      acs: Math.round(weightedAvg(played, (r) => r.acs)),
      adr: Math.round(adr),
      kast: Math.round(kast),
      rating: computeRating({ rounds, kills, deaths, assists, kastPct: kast, adr }),
    };
  });
}
