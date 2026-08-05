export type SessionUser = { id: string; globalRole: "ADMIN" | "USER" } | null;

/** Une ligne de gestion : qui, et à quel niveau. */
export type ManagerEntry = { userId: string; role: "OWNER" | "MANAGER" };

export function isAdmin(user: SessionUser): boolean {
  return user?.globalRole === "ADMIN";
}

/** managerUserIds = ids des users managers de CETTE équipe. */
export function canManageTeam(user: SessionUser, managerUserIds: string[]): boolean {
  if (!user) return false;
  if (isAdmin(user)) return true;
  return managerUserIds.includes(user.id);
}

/** managerUserIds = ids des users managers de CE tournoi. */
export function canManageTournament(user: SessionUser, managerUserIds: string[]): boolean {
  if (!user) return false;
  if (isAdmin(user)) return true;
  return managerUserIds.includes(user.id);
}

/**
 * Droit d'administration : supprimer l'objet, et ajouter ou retirer des
 * managers. Réservé aux propriétaires et aux admins.
 *
 * Le simple manager en est exclu à dessein : sans cette distinction, quelqu'un
 * invité pour donner un coup de main pouvait évincer celui qui l'avait invité,
 * ou supprimer d'un clic un tournoi entier et tout son historique de matchs.
 */
export function canAdminister(user: SessionUser, managers: readonly ManagerEntry[]): boolean {
  if (!user) return false;
  if (isAdmin(user)) return true;
  return managers.some((m) => m.userId === user.id && m.role === "OWNER");
}

/** Ids des managers, tous niveaux confondus. */
export function managerUserIds(managers: readonly ManagerEntry[]): string[] {
  return managers.map((m) => m.userId);
}

/**
 * Ce propriétaire est-il le dernier ? Le retirer laisserait un groupe sans
 * personne pour administrer ses managers.
 */
export function isLastOwner(managers: readonly ManagerEntry[], userId: string): boolean {
  const owners = managers.filter((m) => m.role === "OWNER");
  return owners.length === 1 && owners[0].userId === userId;
}
