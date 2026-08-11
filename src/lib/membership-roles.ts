/**
 * Rôles tenus dans l'effectif d'une équipe.
 *
 * La liste double l'enum `MembershipRole` de Prisma : le client Prisma n'est
 * pas importable depuis un composant client, et ces libellés s'affichent des
 * deux côtés.
 */
export const MEMBERSHIP_ROLES = ["JOUEUR", "SUB", "COACH", "MANAGER"] as const;
export type MembershipRoleKey = (typeof MEMBERSHIP_ROLES)[number];

export const MEMBERSHIP_ROLE_LABELS: Record<MembershipRoleKey, string> = {
  JOUEUR: "Joueur",
  SUB: "Remplaçant",
  COACH: "Coach",
  MANAGER: "Manager",
};

/**
 * Un titulaire est décrit par son rôle Valorant ; les autres ont besoin d'un
 * pictogramme propre, le jeu n'en fournissant aucun pour l'encadrement.
 */
export function hasOwnIcon(role: string): boolean {
  return role === "SUB" || role === "COACH" || role === "MANAGER";
}
