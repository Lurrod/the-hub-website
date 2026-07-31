// Logique pure du statut « recherche d'équipe » (LFT) et des filtres de la
// page /lft. Isolée de Prisma et du rendu pour être testable directement.

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

// --- Âge -------------------------------------------------------------------

/** Tranches d'âge proposées. `max` absent = pas de borne haute. */
export const AGE_BRACKETS = [
  { key: "u18", label: "Moins de 18", min: 0, max: 17 },
  { key: "18-20", label: "18 - 20", min: 18, max: 20 },
  { key: "21-24", label: "21 - 24", min: 21, max: 24 },
  { key: "25+", label: "25 et plus", min: 25 },
] as const;

export type AgeBracketKey = (typeof AGE_BRACKETS)[number]["key"];

export function normalizeAgeBracket(raw: string | undefined): AgeBracketKey | undefined {
  return AGE_BRACKETS.some((b) => b.key === raw) ? (raw as AgeBracketKey) : undefined;
}

/** Même date décalée de `years` années en arrière. */
function minusYears(date: Date, years: number): Date {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() - years);
  return d;
}

/**
 * Traduit une tranche d'âge en intervalle de dates de naissance, seule forme
 * que la base sait filtrer. Avoir `min` ans revient à être né au plus tard
 * il y a `min` ans ; avoir au plus `max` ans revient à être né après la date
 * anniversaire des `max + 1` ans.
 *
 * Retourne `undefined` si la tranche est inconnue (aucun filtre appliqué).
 */
export function birthdateRangeForAge(
  bracket: string | undefined,
  now: Date = new Date()
): { lte: Date; gt?: Date } | undefined {
  const key = normalizeAgeBracket(bracket);
  if (!key) return undefined;
  const b = AGE_BRACKETS.find((x) => x.key === key)!;
  const range: { lte: Date; gt?: Date } = { lte: minusYears(now, b.min) };
  if ("max" in b) range.gt = minusYears(now, b.max + 1);
  return range;
}

// --- Statut d'équipe -------------------------------------------------------

export const TEAM_STATUSES = [
  { key: "free", label: "Sans équipe" },
  { key: "team", label: "En équipe" },
] as const;

export type TeamStatusKey = (typeof TEAM_STATUSES)[number]["key"];

export function normalizeTeamStatus(raw: string | undefined): TeamStatusKey | undefined {
  return TEAM_STATUSES.some((s) => s.key === raw) ? (raw as TeamStatusKey) : undefined;
}

// --- Recherche texte -------------------------------------------------------

const MAX_SEARCH_LENGTH = 40;

/** Recherche par pseudo : coupée et bornée, vide = pas de filtre. */
export function normalizeLftSearch(raw: string | undefined): string | undefined {
  const q = raw?.trim().slice(0, MAX_SEARCH_LENGTH);
  return q ? q : undefined;
}

// --- Agrégat ---------------------------------------------------------------

export type LftFilters = {
  role?: ValorantRoleKey;
  country?: string;
  age?: AgeBracketKey;
  team?: TeamStatusKey;
  q?: string;
};

/** Vrai dès qu'au moins un filtre est actif (pour proposer la réinitialisation). */
export function hasActiveLftFilter(filters: LftFilters): boolean {
  return Object.values(filters).some(Boolean);
}

/**
 * Construit le lien de la page LFT en conservant les filtres actifs. Passer
 * `undefined` pour une clé la retire de l'URL.
 */
export function lftHref(filters: LftFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `/lft?${query}` : "/lft";
}
