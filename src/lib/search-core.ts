/**
 * Normalisation d'une chaîne de recherche, côté logique pure.
 *
 * Une requête part d'un champ texte libre et atterrit dans un `contains` /
 * `ILIKE` Prisma. C'est paramétré, donc pas d'injection — mais rien ne bornait
 * la longueur : un `q` de plusieurs kilo-octets répété faisait travailler la
 * base pour rien. Le plafond est le même esprit que `normalizeLfpSearch` et
 * `normalizePlayerSearch`, ici centralisé pour la recherche globale et la
 * couche data.
 */

/** Au-delà, c'est du bruit : aucun nom d'équipe, joueur ou tournoi ne l'atteint. */
export const MAX_SEARCH_LENGTH = 60;

/** Coupe et borne une requête. Rend `""` si elle est vide après nettoyage. */
export function capSearchQuery(raw: string | null | undefined): string {
  return (raw ?? "").trim().slice(0, MAX_SEARCH_LENGTH);
}
