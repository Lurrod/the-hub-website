/**
 * Cumul des statistiques d'un joueur sur toutes les maps d'une rencontre.
 *
 * Module pur, sans dépendance à la base ni au rendu : il alimente l'onglet
 * « Toutes les maps » du scoreboard de la fiche match.
 */

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

/** Ligne cumulée : la même forme, plus les agents joués et le nombre de maps. */
export type SeriesRow = SeriesInputRow & {
  /** Agents joués, du plus joué au moins joué. */
  agents: string[];
  /** Nombre de maps sur lesquelles ce joueur a des statistiques. */
  mapsPlayed: number;
};

/**
 * Une ligne sans fiche joueur reste identifiable par son Riot ID : c'est le
 * seul repère stable d'un compte non rattaché, et deux maps de la même
 * rencontre doivent se regrouper dessus.
 */
function playerKey(row: SeriesInputRow): string {
  return row.playerId ?? row.riotName;
}

/** Moyenne entière d'un champ, pour les indicateurs affichés sans décimale. */
function avgRounded(rows: readonly SeriesInputRow[], pick: (r: SeriesInputRow) => number): number {
  return Math.round(rows.reduce((n, r) => n + pick(r), 0) / rows.length);
}

/**
 * Agents joués, du plus joué au moins joué, sans doublon. À égalité de maps,
 * l'ordre alphabétique : deux affichages successifs doivent aligner les
 * icônes dans le même ordre.
 */
function rankAgents(rows: readonly SeriesInputRow[]): string[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (row.agent) counts.set(row.agent, (counts.get(row.agent) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr"))
    .map(([agent]) => agent);
}

/**
 * Cumule les statistiques de chaque joueur sur l'ensemble des maps.
 *
 * Les compteurs s'additionnent (frags, assists, entrées). Les indicateurs de
 * performance se moyennent **sur les seules maps jouées par ce joueur** : un
 * remplaçant entré sur une map ne doit pas voir sa moyenne diluée par celles
 * où il n'était pas là.
 *
 * @param maps les listes de statistiques, une par map de la rencontre.
 */
export function aggregateSeries(maps: readonly (readonly SeriesInputRow[])[]): SeriesRow[] {
  const grouped = new Map<string, SeriesInputRow[]>();
  for (const rows of maps) {
    for (const row of rows) {
      const key = playerKey(row);
      const bucket = grouped.get(key);
      if (bucket) bucket.push(row);
      else grouped.set(key, [row]);
    }
  }

  return [...grouped.entries()].map(([key, rows]) => {
    const agents = rankAgents(rows);
    return {
      ...rows[0],
      // L'identifiant ne peut pas être celui d'une ligne de map : il doit
      // rester le même quel que soit le nombre de maps agrégées, sans quoi
      // React remonterait la ligne à chaque changement d'onglet.
      id: `serie-${key}`,
      agents,
      agent: agents[0] ?? null,
      mapsPlayed: rows.length,
      kills: rows.reduce((n, r) => n + r.kills, 0),
      deaths: rows.reduce((n, r) => n + r.deaths, 0),
      assists: rows.reduce((n, r) => n + r.assists, 0),
      firstKills: rows.reduce((n, r) => n + r.firstKills, 0),
      firstDeaths: rows.reduce((n, r) => n + r.firstDeaths, 0),
      acs: avgRounded(rows, (r) => r.acs),
      adr: avgRounded(rows, (r) => r.adr),
      kast: avgRounded(rows, (r) => r.kast),
      // Le rating garde ses décimales : il est affiché avec deux chiffres.
      rating: rows.reduce((n, r) => n + r.rating, 0) / rows.length,
    };
  });
}
