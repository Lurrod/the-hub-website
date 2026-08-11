import type { Side } from "@/lib/match-stats-core";
import { displayName } from "@/lib/og/labels";
import { aggregateSeries, type SeriesMap } from "@/lib/scoreboard-series";

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
 * Statistiques cumulées d'une série, une ligne par joueur.
 *
 * Le cumul lui-même vit dans `@/lib/scoreboard-series`, partagé avec l'onglet
 * « Toutes les maps » du scoreboard : les deux affichages doivent donner le
 * même chiffre pour la même rencontre.
 */
export function seriesRows(maps: readonly SeriesMap[]): CardStatRow[] {
  return aggregateSeries(maps)
    .map((row) => ({
      key: row.id,
      name: displayName(row.pseudo, row.riotName),
      side: row.teamSide === "A" ? ("A" as const) : ("B" as const),
      agents: row.agents,
      kills: row.kills,
      deaths: row.deaths,
      assists: row.assists,
      acs: row.acs,
      rating: row.rating,
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
