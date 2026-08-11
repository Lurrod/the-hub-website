import type { Side } from "@/lib/match-stats-core";
import { displayName } from "@/lib/og/labels";

/**
 * Ligne de statistiques telle qu'elle sort de la base (`PlayerGameStat` et sa
 * relation `player`), avant toute mise en forme.
 */
export type RawStat = {
  playerId: string | null;
  pseudo: string | null;
  riotName: string | null;
  teamSide: string;
  agent: string | null;
  kills: number;
  deaths: number;
  assists: number;
  acs: number;
  rating: number;
};

/** Ligne prête à être posée sur une carte de scoreboard. */
export type CardStatRow = {
  /** Identité de regroupement : la fiche du joueur, ou son Riot ID à défaut. */
  key: string;
  name: string;
  side: Side;
  /**
   * Agents joués, du plus joué au moins joué. Une seule entrée sur une map,
   * autant que d'agents différents sur une série, aucune quand la donnée
   * manque.
   */
  agents: string[];
  kills: number;
  deaths: number;
  assists: number;
  acs: number;
  rating: number;
};

/**
 * Une ligne sans fiche joueur reste identifiable par son Riot ID : c'est le
 * seul repère stable d'un compte non rattaché, et deux maps de la même série
 * doivent se regrouper dessus.
 */
function rowKey(stat: RawStat): string {
  return stat.playerId ?? stat.riotName ?? "";
}

/** Le camp est stocké en texte libre ; tout ce qui n'est pas « A » est B. */
function side(stat: RawStat): Side {
  return stat.teamSide === "A" ? "A" : "B";
}

/**
 * Du meilleur rating au moins bon. L'égalité se départage sur le nom : sans
 * cela, deux rendus successifs de la même carte pourraient intervertir deux
 * joueurs, et l'image ne serait plus reproductible.
 */
function byRating(a: CardStatRow, b: CardStatRow): number {
  return b.rating - a.rating || a.name.localeCompare(b.name, "fr");
}

/** Les statistiques d'une map, classées. */
export function mapRows(stats: readonly RawStat[]): CardStatRow[] {
  return stats
    .map((s) => ({
      key: rowKey(s),
      name: displayName(s.pseudo, s.riotName),
      side: side(s),
      agents: s.agent ? [s.agent] : [],
      kills: s.kills,
      deaths: s.deaths,
      assists: s.assists,
      acs: s.acs,
      rating: s.rating,
    }))
    .sort(byRating);
}

/**
 * Agents joués sur la série, du plus joué au moins joué, sans doublon. À
 * égalité de maps, l'ordre alphabétique : deux rendus de la même carte doivent
 * aligner les icônes dans le même ordre.
 */
function rankAgents(agents: readonly (string | null)[]): string[] {
  const counts = new Map<string, number>();
  for (const agent of agents) {
    if (agent) counts.set(agent, (counts.get(agent) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr"))
    .map(([agent]) => agent);
}

/**
 * Statistiques cumulées d'une série, une ligne par joueur.
 *
 * Les frags s'additionnent, l'ACS et le rating se moyennent sur les maps
 * réellement jouées par ce joueur : un remplaçant entré sur une seule map ne
 * doit pas voir sa moyenne diluée par les maps où il n'était pas là.
 */
export function seriesRows(stats: readonly RawStat[]): CardStatRow[] {
  const grouped = new Map<string, RawStat[]>();
  for (const stat of stats) {
    const key = rowKey(stat);
    const bucket = grouped.get(key);
    if (bucket) bucket.push(stat);
    else grouped.set(key, [stat]);
  }

  return [...grouped.entries()]
    .map(([key, rows]) => ({
      key,
      name: displayName(rows[0].pseudo, rows[0].riotName),
      side: side(rows[0]),
      agents: rankAgents(rows.map((r) => r.agent)),
      kills: rows.reduce((n, r) => n + r.kills, 0),
      deaths: rows.reduce((n, r) => n + r.deaths, 0),
      assists: rows.reduce((n, r) => n + r.assists, 0),
      acs: rows.reduce((n, r) => n + r.acs, 0) / rows.length,
      rating: rows.reduce((n, r) => n + r.rating, 0) / rows.length,
    }))
    .sort(byRating);
}

/** Répartit les lignes entre les deux camps, sans changer leur ordre. */
export function bySide(rows: readonly CardStatRow[]): { a: CardStatRow[]; b: CardStatRow[] } {
  return {
    a: rows.filter((r) => r.side === "A"),
    b: rows.filter((r) => r.side === "B"),
  };
}

/**
 * « 24/13/6 ». Sans espaces : sur la carte de série les compteurs passent à
 * trois chiffres, et la colonne se casserait sur deux lignes.
 */
export function kdaLabel(row: { kills: number; deaths: number; assists: number }): string {
  return `${row.kills}/${row.deaths}/${row.assists}`;
}
