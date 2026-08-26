// Rôles Valorant : libellés FR + icônes officielles, rapatriées dans public/ par
// `npm run assets:valorant` (plus aucun appel à valorant-api.com au rendu).
export const VALORANT_ROLES = ["DUELIST", "CONTROLLER", "INITIATOR", "SENTINEL"] as const;
export type ValorantRoleKey = (typeof VALORANT_ROLES)[number];

export const ROLE_LABELS: Record<ValorantRoleKey, string> = {
  DUELIST: "Duelliste",
  CONTROLLER: "Contrôleur",
  INITIATOR: "Initiateur",
  SENTINEL: "Sentinelle",
};

// >>> table générée par `npm run assets:valorant` — ne pas éditer à la main
export const ROLE_ICONS: Record<ValorantRoleKey, string> = {
  CONTROLLER: "/valorant/roles/controller.webp",
  DUELIST: "/valorant/roles/duelist.webp",
  INITIATOR: "/valorant/roles/initiator.webp",
  SENTINEL: "/valorant/roles/sentinel.webp",
};
// <<< fin de la table générée

export function roleIconUrl(role: string | null | undefined): string | undefined {
  if (!role) return undefined;
  return ROLE_ICONS[role as ValorantRoleKey];
}

export function roleLabel(role: string | null | undefined): string | undefined {
  if (!role) return undefined;
  return ROLE_LABELS[role as ValorantRoleKey];
}
