/**
 * Logique pure des blocs « confrontations directes » et « forme récente » de
 * la fiche de match. Rien ici ne touche la base : les fonctions reçoivent des
 * lignes déjà chargées, ou rendent un fragment de clause `where` que
 * `src/lib/data/matches.ts` assemble. C'est ce qui les rend testables, comme
 * pour `match-stats-core.ts` et `tournament-teams-core.ts`.
 */

/**
 * « Ce qui s'est joué avant le match affiché ». Sans cette borne, la fiche
 * d'un match d'octobre listerait des résultats de décembre comme s'ils
 * l'annonçaient — un contresens qui s'aggrave à mesure que l'historique du
 * site s'allonge.
 */
export type MatchCutoff = {
  /**
   * Date du match affiché. Nulle quand il n'en a pas — `Match.date` est
   * optionnel, et un match sans date ne peut borner personne. La borne
   * disparaît alors et seule l'exclusion du match lui-même subsiste.
   */
  before: Date | null;
  /**
   * Identifiant du match affiché. Toujours écarté : un match terminé figure
   * dans les résultats de ses propres équipes et apparaîtrait sinon dans sa
   * propre liste de forme récente.
   */
  excludeMatchId: string;
};

export type CutoffWhere = {
  id: { not: string };
  date?: { lt: Date };
};

/**
 * Fragment de clause `where` correspondant à la borne.
 *
 * `date: { lt: … }` écarte au passage les matchs sans date : en SQL, une
 * comparaison avec NULL n'est jamais vraie. C'est exactement le comportement
 * voulu — on ne peut pas affirmer qu'un match sans date précède celui affiché.
 */
export function cutoffWhere(cutoff: MatchCutoff): CutoffWhere {
  const base: CutoffWhere = { id: { not: cutoff.excludeMatchId } };
  return cutoff.before ? { ...base, date: { lt: cutoff.before } } : base;
}

export type TallyRow = { winnerId: string | null };

export type HeadToHeadTally = {
  /** Rencontres gagnées par la première équipe passée en argument. */
  winsA: number;
  /** Rencontres gagnées par la seconde. */
  winsB: number;
};

/**
 * Bilan des rencontres, calculé en mémoire sur les lignes déjà chargées —
 * une requête d'agrégat de plus ne se justifierait pas pour dix lignes au
 * maximum.
 *
 * Un match terminé sans vainqueur — `winnerId` nul, ce que le schéma
 * autorise — figure dans la liste mais dans aucun total : le match nul
 * n'existe pas en Valorant, et lui inventer une colonne embrouillerait le
 * bilan plus qu'il ne l'éclairerait.
 */
export function headToHeadTally(
  rows: readonly TallyRow[],
  teamAId: string,
  teamBId: string
): HeadToHeadTally {
  let winsA = 0;
  let winsB = 0;
  for (const row of rows) {
    if (row.winnerId === teamAId) winsA++;
    else if (row.winnerId === teamBId) winsB++;
  }
  return { winsA, winsB };
}

export type FormResult = "WIN" | "LOSS" | "DRAW";

export type FormRow = { winnerId: string | null };

/**
 * Suite de résultats d'une équipe, du plus ancien au plus récent — l'ordre
 * dans lequel se lit une série de forme. Les lignes arrivent dans l'ordre
 * inverse, celui de la requête, d'où le `reverse`.
 */
export function formResults(rows: readonly FormRow[], teamId: string): FormResult[] {
  return rows
    .map((row): FormResult => {
      if (row.winnerId === teamId) return "WIN";
      return row.winnerId === null ? "DRAW" : "LOSS";
    })
    .reverse();
}
