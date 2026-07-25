export type SessionUser = { id: string; globalRole: "ADMIN" | "USER" } | null;

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
