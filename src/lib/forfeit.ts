import type { MatchForfeit } from "@/lib/constants";

/**
 * Vainqueur imposé par un forfait, ou null si aucun forfait n'est déclaré.
 * Prime sur le score : un forfait se déclare le plus souvent sur un match
 * resté à 0-0, dont le score ne désignerait personne.
 */
export function forfeitWinnerId(
  forfeit: MatchForfeit,
  teamAId: string,
  teamBId: string
): string | null {
  if (forfeit === "TEAM_A") return teamBId;
  if (forfeit === "TEAM_B") return teamAId;
  return null;
}

/**
 * Libellés de score à afficher : « W / FF » sur un forfait, les chiffres
 * sinon. Partagé par les cases du bracket, les listes de matchs, la fiche
 * match et les cartes OG, pour que le même match ne raconte pas deux
 * histoires.
 *
 * Même règle que la dérivation du vainqueur : le forfait ne vaut qu'une fois
 * le match « Terminé ». Déclaré à l'avance, il n'a pas à annoncer W / FF sur
 * un match encore à jouer — et sans statut connu, on s'abstient aussi.
 *
 * Sur un BO1 dont la map est connue, le score affiché est celui de la map :
 * « 1 - 0 » n'apprend rien quand la série et la map ne font qu'un. Les vues
 * qui ne chargent pas les maps gardent le score de série, faute de mieux.
 */
export function displayScores(match: {
  scoreA: number;
  scoreB: number;
  forfeit?: MatchForfeit | null;
  status?: string | null;
  bestOf?: number | null;
  maps?: { scoreA: number; scoreB: number }[] | null;
}): { a: string; b: string } {
  if (match.status === "FINISHED") {
    if (match.forfeit === "TEAM_A") return { a: "FF", b: "W" };
    if (match.forfeit === "TEAM_B") return { a: "W", b: "FF" };
  }
  if (match.bestOf === 1 && match.maps?.length === 1) {
    const [map] = match.maps;
    return { a: String(map.scoreA), b: String(map.scoreB) };
  }
  return { a: String(match.scoreA), b: String(match.scoreB) };
}
