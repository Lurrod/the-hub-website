import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  isAdmin,
  canManageTeam,
  canManageTournament,
  canAdminister,
  managerUserIds,
  type ManagerEntry,
  type SessionUser,
} from "@/lib/permissions";
import { logger } from "@/lib/logger";

export async function getSessionUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) return null;
  return { id: session.user.id, globalRole: session.user.globalRole };
}

export async function requireAdmin(): Promise<SessionUser & object> {
  const user = await getSessionUser();
  if (!isAdmin(user)) throw forbidden("admin", null, user);
  return user!;
}

/**
 * Trace le refus avant de le lever. Un échec d'autorisation était jusqu'ici
 * totalement muet : rien ne permettait de distinguer un bug de droits d'une
 * tentative répétée. Seuls des identifiants techniques sont journalisés.
 */
function forbidden(scope: string, resourceId: string | null, user: SessionUser): Error {
  logger.warn("authz.denied", {
    scope,
    resourceId,
    userId: user?.id ?? null,
    role: user?.globalRole ?? null,
  });
  return new Error("FORBIDDEN");
}

/** Managers de l'équipe avec leur niveau (OWNER / MANAGER). */
export function getTeamManagers(teamId: string): Promise<ManagerEntry[]> {
  return db.teamManager.findMany({ where: { teamId }, select: { userId: true, role: true } });
}

export async function getTeamManagerIds(teamId: string): Promise<string[]> {
  return managerUserIds(await getTeamManagers(teamId));
}

/**
 * Autorise si admin OU **propriétaire** de cette équipe. Réservé aux actions
 * qui engagent l'équipe entière : suppression, gestion des managers.
 */
export async function assertCanAdministerTeam(teamId: string): Promise<SessionUser & object> {
  const user = await getSessionUser();
  const managers = await getTeamManagers(teamId);
  if (!canAdminister(user, managers)) throw forbidden("team.admin", teamId, user);
  return user!;
}

/** Autorise si admin OU manager de cette équipe. Lève "FORBIDDEN" sinon. */
export async function assertCanManageTeam(teamId: string): Promise<SessionUser & object> {
  const user = await getSessionUser();
  const managerIds = await getTeamManagerIds(teamId);
  if (!canManageTeam(user, managerIds)) throw forbidden("team", teamId, user);
  return user!;
}

/** Managers du tournoi avec leur niveau (OWNER / MANAGER). */
export function getTournamentManagers(tournamentId: string): Promise<ManagerEntry[]> {
  return db.tournamentManager.findMany({
    where: { tournamentId },
    select: { userId: true, role: true },
  });
}

export async function getTournamentManagerIds(tournamentId: string): Promise<string[]> {
  return managerUserIds(await getTournamentManagers(tournamentId));
}

/** Autorise si admin OU **propriétaire** de ce tournoi. */
export async function assertCanAdministerTournament(
  tournamentId: string
): Promise<SessionUser & object> {
  const user = await getSessionUser();
  const managers = await getTournamentManagers(tournamentId);
  if (!canAdminister(user, managers)) throw forbidden("tournament.admin", tournamentId, user);
  return user!;
}

/** Autorise si admin OU manager de ce tournoi. Lève "FORBIDDEN" sinon. */
export async function assertCanManageTournament(
  tournamentId: string
): Promise<SessionUser & object> {
  const user = await getSessionUser();
  const managerIds = await getTournamentManagerIds(tournamentId);
  if (!canManageTournament(user, managerIds)) throw forbidden("tournament", tournamentId, user);
  return user!;
}
