// Rôles Valorant : libellés FR + icônes officielles (valorant-api.com, figées).
export const VALORANT_ROLES = ["DUELIST", "CONTROLLER", "INITIATOR", "SENTINEL"] as const;
export type ValorantRoleKey = (typeof VALORANT_ROLES)[number];

export const ROLE_LABELS: Record<ValorantRoleKey, string> = {
  DUELIST: "Duelliste",
  CONTROLLER: "Contrôleur",
  INITIATOR: "Initiateur",
  SENTINEL: "Sentinelle",
};

export const ROLE_ICONS: Record<ValorantRoleKey, string> = {
  DUELIST:
    "https://media.valorant-api.com/agents/roles/dbe8757e-9e92-4ed4-b39f-9dfc589691d4/displayicon.png",
  CONTROLLER:
    "https://media.valorant-api.com/agents/roles/4ee40330-ecdd-4f2f-98a8-eb1243428373/displayicon.png",
  INITIATOR:
    "https://media.valorant-api.com/agents/roles/1b47567f-8f7b-444b-aae3-b0c634622d10/displayicon.png",
  SENTINEL:
    "https://media.valorant-api.com/agents/roles/5fc02f99-4091-4486-a531-98459a3e95e9/displayicon.png",
};

export function roleIconUrl(role: string | null | undefined): string | undefined {
  if (!role) return undefined;
  return ROLE_ICONS[role as ValorantRoleKey];
}

export function roleLabel(role: string | null | undefined): string | undefined {
  if (!role) return undefined;
  return ROLE_LABELS[role as ValorantRoleKey];
}
