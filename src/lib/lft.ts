// Logique pure du statut « recherche d'équipe » (LFT). Isolée de Prisma et du
// rendu pour être testable directement.

import { VALORANT_ROLES, type ValorantRoleKey } from "@/lib/roles";

export type LftState = { lft: boolean; lftSince: Date | null };

/**
 * État suivant du statut LFT : on horodate la mise en recherche (sert au tri
 * et à l'affichage « LFT depuis X »), et on efface la date à l'extinction pour
 * ne pas laisser traîner une ancienneté trompeuse.
 */
export function nextLftState(current: boolean, now: Date = new Date()): LftState {
  return current ? { lft: false, lftSince: null } : { lft: true, lftSince: now };
}

/**
 * Ne retient un rôle que s'il fait partie des rôles Valorant connus : toute
 * autre valeur d'URL est ignorée plutôt que passée telle quelle à la requête.
 */
export function normalizeLftRole(raw: string | undefined): ValorantRoleKey | undefined {
  return (VALORANT_ROLES as readonly string[]).includes(raw ?? "")
    ? (raw as ValorantRoleKey)
    : undefined;
}

/**
 * Ne retient un pays que s'il figure parmi ceux réellement présents dans la
 * liste : un filtre qui ne renverrait rien vaut « pas de filtre ».
 */
export function normalizeLftCountry(
  raw: string | undefined,
  available: readonly string[]
): string | undefined {
  return raw && available.includes(raw) ? raw : undefined;
}
