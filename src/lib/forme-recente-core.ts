/**
 * Forme récente d'une équipe, préparée pour la frise de la fiche équipe.
 *
 * La frise encode deux choses par barre : le **sens** dit le résultat — au-dessus
 * de la ligne pour une victoire, en dessous pour une défaite — et la **hauteur**
 * dit l'écart de rounds. C'est ce que la suite de pastilles V/D ne peut pas
 * montrer : une victoire 13-11 et une victoire 13-2 y sont le même jeton, alors
 * qu'elles ne racontent pas la même rencontre.
 *
 * Le sens porte donc le résultat indépendamment de la couleur. C'est ce qui rend
 * la frise lisible pour un daltonien, à qui le vert et le rouge ne disent rien —
 * la couleur n'y est qu'un renfort, jamais le seul porteur du sens.
 *
 * Ce module ne touche ni au DOM ni à la base : il reçoit des matchs et rend de
 * quoi dessiner.
 */

export type ResultatForme = "WIN" | "LOSS" | "DRAW";

/** Match tel que le rend `listTeamRecentMatches`, réduit à ce qui sert ici. */
export type MatchSource = {
  id: string;
  date: Date | null;
  teamAId: string;
  teamBId: string;
  scoreA: number;
  scoreB: number;
  winnerId: string | null;
  teamA: { tag: string; logo: string | null };
  teamB: { tag: string; logo: string | null };
  maps: { scoreA: number; scoreB: number }[];
};

export type MatchForme = {
  id: string;
  date: Date | null;
  resultat: ResultatForme;
  adversaire: { tag: string; logo: string | null };
  /**
   * Écart de rounds du point de vue de l'équipe, toutes maps confondues.
   *
   * `null` quand aucune map n'est enregistrée : la rencontre existe, son détail
   * non. Inventer une hauteur lui ferait dire une domination qu'on ignore — la
   * frise la marque autrement.
   */
  ecart: number | null;
  /** Rounds pour et contre, `null` en l'absence de map enregistrée. */
  rounds: { pour: number; contre: number } | null;
  /** Score en maps, toujours connu : c'est ce que porte le match lui-même. */
  maps: { pour: number; contre: number };
};

export type Forme = {
  /** Du plus ancien au plus récent : c'est le sens de lecture d'une frise. */
  matchs: MatchForme[];
  victoires: number;
  defaites: number;
  nuls: number;
  /**
   * Série en cours, comptée depuis le match le plus récent. Positive pour des
   * victoires d'affilée, négative pour des défaites, nulle si la dernière
   * rencontre n'a pas de vainqueur.
   */
  serie: number;
  /** Plus grand écart en valeur absolue : cale la hauteur des barres. */
  ecartMax: number;
};

/** Nombre de matchs retenus par défaut. Au-delà, les barres deviennent des traits. */
export const FORME_LIMITE = 12;

/**
 * Construit la forme récente d'une équipe.
 *
 * @param matchs matchs terminés, du plus récent au plus ancien — l'ordre que
 *   rend la base
 * @param teamId équipe dont on regarde la forme
 * @param limite nombre de rencontres retenues, les plus récentes
 */
export function construireForme(
  matchs: readonly MatchSource[],
  teamId: string,
  limite = FORME_LIMITE
): Forme {
  // La série se lit sur l'ordre d'entrée, du plus récent au plus ancien, et
  // avant tout écrêtage : elle décrit l'équipe, pas la fenêtre affichée.
  let serie = 0;
  for (const m of matchs) {
    const r = resultatDe(m, teamId);
    if (r === "DRAW") break;
    if (serie === 0) serie = r === "WIN" ? 1 : -1;
    else if (serie > 0 === (r === "WIN")) serie += serie > 0 ? 1 : -1;
    else break;
  }

  const retenus = matchs.slice(0, Math.max(0, limite));
  const entrees = retenus.map((m) => versEntree(m, teamId)).reverse();

  return {
    matchs: entrees,
    victoires: entrees.filter((e) => e.resultat === "WIN").length,
    defaites: entrees.filter((e) => e.resultat === "LOSS").length,
    nuls: entrees.filter((e) => e.resultat === "DRAW").length,
    serie,
    ecartMax: entrees.reduce((max, e) => Math.max(max, Math.abs(e.ecart ?? 0)), 0),
  };
}

/**
 * Résultat lu sur le vainqueur, et non par comparaison des scores.
 *
 * Sur un forfait les scores restent à 0-0 : les comparer classerait la
 * rencontre en match nul alors qu'elle a bien un vainqueur.
 */
function resultatDe(m: MatchSource, teamId: string): ResultatForme {
  if (m.winnerId === null) return "DRAW";
  return m.winnerId === teamId ? "WIN" : "LOSS";
}

function versEntree(m: MatchSource, teamId: string): MatchForme {
  const chezA = m.teamAId === teamId;
  const adversaire = chezA ? m.teamB : m.teamA;

  const rounds = m.maps.length
    ? m.maps.reduce(
        (acc, map) => ({
          pour: acc.pour + (chezA ? map.scoreA : map.scoreB),
          contre: acc.contre + (chezA ? map.scoreB : map.scoreA),
        }),
        { pour: 0, contre: 0 }
      )
    : null;

  return {
    id: m.id,
    date: m.date,
    resultat: resultatDe(m, teamId),
    adversaire,
    ecart: rounds ? rounds.pour - rounds.contre : null,
    rounds,
    maps: {
      pour: chezA ? m.scoreA : m.scoreB,
      contre: chezA ? m.scoreB : m.scoreA,
    },
  };
}
