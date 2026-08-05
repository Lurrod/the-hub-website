/** Niveaux de gestion d'une équipe ou d'un tournoi. */
export const MANAGER_ROLES = ["OWNER", "MANAGER"] as const;
export type ManagerRoleKey = (typeof MANAGER_ROLES)[number];

export const MANAGER_ROLE_LABELS: Record<ManagerRoleKey, string> = {
  OWNER: "Propriétaire",
  MANAGER: "Manager",
};

export const MANAGER_ROLE_HINTS: Record<ManagerRoleKey, string> = {
  OWNER: "Gère le quotidien, et peut aussi supprimer et administrer les managers.",
  MANAGER: "Gère le quotidien : fiche, roster, compétition, inscriptions.",
};

/**
 * Niveau lu depuis un formulaire. Toute valeur inattendue retombe sur le
 * niveau le plus bas : un champ manquant ou trafiqué ne doit jamais accorder
 * plus de droits que prévu.
 */
export function parseManagerRole(value: unknown): ManagerRoleKey {
  return value === "OWNER" ? "OWNER" : "MANAGER";
}
