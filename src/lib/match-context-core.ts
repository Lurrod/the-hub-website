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
  /** Identifiant du match affiché, toujours écarté de ses propres résultats. */
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
 * comparaison avec NULL n'est jamais vraie.
 */
export function cutoffWhere(cutoff: MatchCutoff): CutoffWhere {
  const base: CutoffWhere = { id: { not: cutoff.excludeMatchId } };
  return cutoff.before !== null ? { ...base, date: { lt: cutoff.before } } : base;
}

/** Le seul champ dont ce module a besoin pour juger d'une rencontre. */
export type MatchOutcomeRow = { winnerId: string | null };

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
 * Le comptage ne regarde que `winnerId` : le camp occupé lors des rencontres
 * passées n'entre jamais en jeu.
 *
 * Un match terminé sans vainqueur — `winnerId` nul, ce que le schéma autorise
 * pour une série à égalité — figure dans la liste mais dans aucun total : une
 * troisième colonne pour un cas rare chargerait le bilan plus qu'elle ne
 * l'éclairerait. `formResults` fait l'inverse et le rend en `DRAW`, parce
 * qu'une frise a la place d'un troisième symbole là où un bilan « 3-2 » n'a
 * pas celle d'un troisième nombre.
 */
export function headToHeadTally(
  rows: readonly MatchOutcomeRow[],
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

export type FormSide = { name: string; tag: string; logo: string | null };

export type FormMatchRow = MatchOutcomeRow & {
  id: string;
  date: Date | null;
  teamAId: string;
  teamBId: string;
  scoreA: number;
  scoreB: number;
  teamA: FormSide;
  teamB: FormSide;
};

/**
 * Une rencontre vue du côté d'une équipe : son adversaire, son score à elle
 * d'abord, et l'issue.
 */
export type FormEntry = {
  id: string;
  date: Date | null;
  opponent: FormSide;
  scoreFor: number;
  scoreAgainst: number;
  result: FormResult;
};

/**
 * Retourne les rencontres du point de vue d'une équipe, dans l'ordre où elles
 * arrivent — de la plus récente à la plus ancienne.
 *
 * Une seule fonction rend à la fois la liste et la matière de la frise :
 * quand c'étaient deux appels séparés, rien n'empêchait l'appelant de les
 * nourrir de sources différentes et d'afficher une frise qui ne correspondait
 * pas aux matchs listés en dessous.
 */
export function formEntries(rows: readonly FormMatchRow[], teamId: string): FormEntry[] {
  return rows.map((row) => {
    const isA = row.teamAId === teamId;
    return {
      id: row.id,
      date: row.date,
      opponent: isA ? row.teamB : row.teamA,
      scoreFor: isA ? row.scoreA : row.scoreB,
      scoreAgainst: isA ? row.scoreB : row.scoreA,
      result:
        row.winnerId === teamId ? "WIN" : row.winnerId === null ? "DRAW" : ("LOSS" as FormResult),
    };
  });
}

/**
 * Suite de résultats, du plus ancien au plus récent — l'ordre dans lequel se
 * lit une série de forme. Les entrées arrivent dans l'ordre inverse, celui de
 * la requête, d'où le `reverse`.
 */
export function formStreak(entries: readonly FormEntry[]): FormResult[] {
  return entries.map((e) => e.result).reverse();
}
