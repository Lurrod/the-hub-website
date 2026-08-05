/**
 * Logique pure de l'annuaire des joueurs (`/joueurs`) : tri, filtres et liens.
 * Isolée de Prisma et du rendu pour être testable directement, comme `lib/lft`.
 */
import { VALORANT_ROLES, type ValorantRoleKey } from "@/lib/roles";

/** Colonnes sur lesquelles le classement peut être trié. */
export const PLAYER_SORTS = [
  { key: "rating", label: "Rating" },
  { key: "acs", label: "ACS" },
  { key: "maps", label: "Cartes jouées" },
  { key: "pseudo", label: "Pseudo" },
] as const;

export type PlayerSortKey = (typeof PLAYER_SORTS)[number]["key"];

export const DEFAULT_PLAYER_SORT: PlayerSortKey = "rating";

export function normalizePlayerSort(raw: string | undefined): PlayerSortKey {
  return PLAYER_SORTS.some((s) => s.key === raw) ? (raw as PlayerSortKey) : DEFAULT_PLAYER_SORT;
}

/** Statut d'équipe, repris tel quel du LFT pour que les deux pages filtrent pareil. */
export const PLAYER_TEAM_FILTERS = [
  { key: "team", label: "En équipe" },
  { key: "free", label: "Sans équipe" },
] as const;

export type PlayerTeamFilterKey = (typeof PLAYER_TEAM_FILTERS)[number]["key"];

export function normalizePlayerTeamFilter(
  raw: string | undefined
): PlayerTeamFilterKey | undefined {
  return PLAYER_TEAM_FILTERS.some((t) => t.key === raw)
    ? (raw as PlayerTeamFilterKey)
    : undefined;
}

export function normalizePlayerRole(raw: string | undefined): ValorantRoleKey | undefined {
  return (VALORANT_ROLES as readonly string[]).includes(raw ?? "")
    ? (raw as ValorantRoleKey)
    : undefined;
}

const MAX_SEARCH_LENGTH = 40;

export function normalizePlayerSearch(raw: string | undefined): string | undefined {
  const q = raw?.trim().slice(0, MAX_SEARCH_LENGTH);
  return q ? q : undefined;
}

export type PlayerDirectoryFilters = {
  role?: ValorantRoleKey;
  team?: PlayerTeamFilterKey;
  q?: string;
  sort: PlayerSortKey;
};

/** Filtres tels qu'ils voyagent dans l'URL (le tri par défaut n'y figure pas). */
export function directoryParams(f: PlayerDirectoryFilters): Record<string, string | undefined> {
  return {
    role: f.role,
    team: f.team,
    q: f.q,
    sort: f.sort === DEFAULT_PLAYER_SORT ? undefined : f.sort,
  };
}

/** Lien de l'annuaire conservant les filtres actifs. */
export function directoryHref(f: PlayerDirectoryFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(directoryParams(f))) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `/joueurs?${query}` : "/joueurs";
}

export function hasActiveDirectoryFilter(f: PlayerDirectoryFilters): boolean {
  return Boolean(f.role || f.team || f.q) || f.sort !== DEFAULT_PLAYER_SORT;
}

/**
 * Ratio K/D. Une mort de moins qu'un kill n'est pas un ratio infini : sans
 * mort, le nombre de kills fait office de ratio, ce qui reste comparable.
 */
export function killDeathRatio(kills: number, deaths: number): number {
  if (deaths <= 0) return kills;
  return Math.round((kills / deaths) * 100) / 100;
}
