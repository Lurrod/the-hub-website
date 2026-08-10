/**
 * Logique pure du statut « recherche de joueur » (LFP) et des filtres de
 * l'onglet Équipes de la page LFT/LFP. Pendant exact de `lib/lft`, isolé de
 * Prisma et du rendu pour être testable directement.
 */
import { VALORANT_ROLES, type ValorantRoleKey } from "@/lib/roles";

export const LFP_MESSAGE_MAX = 200;

export type LfpState = {
  lfp: boolean;
  lfpSince: Date | null;
  lfpRoles: ValorantRoleKey[];
  lfpMessage: string | null;
};

/**
 * État suivant du statut LFP.
 *
 * Éteindre l'annonce efface aussi les postes et le message : les garder
 * ferait réapparaître une demande périmée au prochain rallumage, alors que
 * l'équipe aura probablement changé de besoin.
 */
export function nextLfpState(
  current: boolean,
  input: { roles?: readonly string[]; message?: string } = {},
  now: Date = new Date()
): LfpState {
  if (current) return { lfp: false, lfpSince: null, lfpRoles: [], lfpMessage: null };
  return {
    lfp: true,
    lfpSince: now,
    lfpRoles: parseLfpRoles(input.roles),
    lfpMessage: normalizeLfpMessage(input.message),
  };
}

/** Ne retient que des rôles Valorant connus, sans doublon et dans l'ordre canonique. */
export function parseLfpRoles(raw: readonly string[] | undefined): ValorantRoleKey[] {
  if (!raw) return [];
  const wanted = new Set(raw);
  return VALORANT_ROLES.filter((r) => wanted.has(r));
}

/** Message d'annonce : coupé, borné, vide = pas de message. */
export function normalizeLfpMessage(raw: string | undefined): string | null {
  const m = raw?.trim().slice(0, LFP_MESSAGE_MAX);
  return m ? m : null;
}

/**
 * Libellé des postes recherchés. Une liste vide veut dire « ouvert à tous »,
 * pas « aucun poste » — c'est le cas d'une équipe qui se reconstruit.
 */
export function lfpRolesLabel(roles: readonly string[], labels: Record<string, string>): string {
  if (roles.length === 0) return "Tous les postes";
  return roles.map((r) => labels[r] ?? r).join(", ");
}

// --- Onglets de la page ----------------------------------------------------

export const LFT_VIEWS = [
  { key: "lft", label: "Joueurs" },
  { key: "lfp", label: "Équipes" },
] as const;

export type LftViewKey = (typeof LFT_VIEWS)[number]["key"];

export function normalizeLftView(raw: string | undefined): LftViewKey {
  return raw === "lfp" ? "lfp" : "lft";
}

export type LfpFilters = { role?: ValorantRoleKey; q?: string };

export function normalizeLfpRole(raw: string | undefined): ValorantRoleKey | undefined {
  return (VALORANT_ROLES as readonly string[]).includes(raw ?? "")
    ? (raw as ValorantRoleKey)
    : undefined;
}

const MAX_SEARCH_LENGTH = 40;

export function normalizeLfpSearch(raw: string | undefined): string | undefined {
  const q = raw?.trim().slice(0, MAX_SEARCH_LENGTH);
  return q ? q : undefined;
}

/**
 * Lien de l'onglet Équipes. La vue voyage dans l'URL pour que le partage d'un
 * lien filtré retombe sur le bon onglet.
 */
export function lfpHref(filters: LfpFilters): string {
  const params = new URLSearchParams({ vue: "lfp" });
  if (filters.role) params.set("role", filters.role);
  if (filters.q) params.set("q", filters.q);
  return `/lft?${params.toString()}`;
}

export function hasActiveLfpFilter(filters: LfpFilters): boolean {
  return Boolean(filters.role || filters.q);
}
