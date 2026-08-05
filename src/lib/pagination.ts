/**
 * Découpage en pages : la logique pure, testable sans rendu.
 *
 * Les listes du site (index des matchs, LFT) chargeaient tout d'un bloc. Ce
 * module fixe une seule fois les règles de bornage et de navigation, pour que
 * les deux pages se comportent pareil.
 */

/**
 * Numéro de page lu depuis l'URL. Toute valeur invalide ramène à la page 1.
 *
 * La forme est contrainte à une suite de chiffres : `Number()` accepterait
 * « 1e3 » ou «  2 », qui n'ont rien à faire dans une URL de pagination.
 */
export function parsePage(raw: string | undefined): number {
  if (typeof raw !== "string" || !/^[0-9]+$/.test(raw)) return 1;
  const n = Number(raw);
  return n >= 1 ? n : 1;
}

export function pageCount(total: number, pageSize: number): number {
  if (pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(total / pageSize));
}

/**
 * Ramène un numéro de page dans les bornes réelles de la liste. Sans ça, un
 * `?p=99` saisi à la main rendait une page vide avec le message « aucun
 * résultat », alors qu'il y en a.
 */
export function clampPage(page: number, total: number, pageSize: number): number {
  return Math.min(Math.max(1, page), pageCount(total, pageSize));
}

/** Décalage SQL correspondant à une page (jamais négatif). */
export function pageOffset(page: number, pageSize: number): number {
  return Math.max(0, (Math.max(1, page) - 1) * pageSize);
}

/**
 * Rang des éléments affichés, en base 1, pour un libellé « 11-20 sur 47 ».
 * Renvoie null quand il n'y a rien à afficher.
 */
export function pageRange(
  page: number,
  pageSize: number,
  total: number
): { from: number; to: number } | null {
  if (total <= 0) return null;
  const from = pageOffset(page, pageSize) + 1;
  if (from > total) return null;
  return { from, to: Math.min(from + pageSize - 1, total) };
}

/**
 * Construit l'URL d'une page en conservant les autres paramètres (filtres,
 * recherche). Sans ça, changer de page réinitialiserait les filtres en cours.
 */
export function pageHref(
  basePath: string,
  params: Record<string, string | undefined>,
  page: number
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") query.set(key, value);
  }
  // La page 1 reste l'URL canonique, sans paramètre superflu.
  if (page > 1) query.set("p", String(page));
  const qs = query.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
