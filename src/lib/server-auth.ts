import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdmin, canManageTeam, canManageTournament, type SessionUser } from "@/lib/permissions";
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

export async function getTeamManagerIds(teamId: string): Promise<string[]> {
  const rows = await db.teamManager.findMany({
    where: { teamId },
    select: { userId: true },
  });
  return rows.map((r) => r.userId);
}

/** Autorise si admin OU manager de cette équipe. Lève "FORBIDDEN" sinon. */
export async function assertCanManageTeam(teamId: string): Promise<SessionUser & object> {
  const user = await getSessionUser();
  const managerIds = await getTeamManagerIds(teamId);
  if (!canManageTeam(user, managerIds)) throw forbidden("team", teamId, user);
  return user!;
}

export async function getTournamentManagerIds(tournamentId: string): Promise<string[]> {
  const rows = await db.tournamentManager.findMany({
    where: { tournamentId },
    select: { userId: true },
  });
  return rows.map((r) => r.userId);
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
