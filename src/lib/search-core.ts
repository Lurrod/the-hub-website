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
/**
 * Neutralise les jokers de `LIKE`/`ILIKE`.
 *
 * Aucune injection n'était possible — les valeurs passent en paramètres liés —
 * mais « % » et « _ » restaient interprétés par PostgreSQL : une recherche sur
 * « % » renvoyait l'annuaire entier au lieu d'un résultat vide, en forçant un
 * parcours séquentiel. La barre oblique inverse s'échappe en premier, sans quoi
 * on échapperait les échappements qu'on vient d'écrire.
 */
export function escapeLikeWildcards(q: string): string {
  return q.replace(/\\/g, "\\\\").replace(/[%_]/g, (c) => `\\${c}`);
}

export function capSearchQuery(raw: string | null | undefined): string {
  return (raw ?? "").trim().slice(0, MAX_SEARCH_LENGTH);
}
