import { randomBytes } from "node:crypto";
import { Prisma, type ManagerRole, type MembershipRole } from "@prisma/client";
import { db } from "@/lib/db";
import { isLastOwner } from "@/lib/permissions";
import type { TeamInput, RosterEntry } from "@/lib/validation/team";
import { INVITE_TTL_DAYS } from "@/lib/invite";

/**
 * Crée un roster initial (nouveaux joueurs + adhésions) pour une équipe.
 * Chaque joueur est créé de zéro, donc aucun conflit avec l'invariant
 * « une seule adhésion active par joueur ».
 */
export async function addInitialRoster(teamId: string, roster: RosterEntry[]): Promise<void> {
  if (roster.length === 0) return;
  await db.$transaction(
    roster.map((entry) =>
      db.player.create({
        data: {
          pseudo: entry.pseudo,
          memberships: {
            create: { teamId, role: entry.role as MembershipRole },
          },
        },
      })
    )
  );
}

export function listTeams(filters?: { region?: string }) {
  return db.team.findMany({
    where: filters?.region ? { region: filters.region } : undefined,
    orderBy: { name: "asc" },
  });
}

/**
 * Comme listTeams, mais avec le roster actif (hors staff) pour l'affichage
 * en cartes façon page tournoi (survol → joueurs).
 */
export function listTeamsWithRoster(filters?: { region?: string }) {
  return db.team.findMany({
    where: filters?.region ? { region: filters.region } : undefined,
    orderBy: { name: "asc" },
    include: {
      memberships: {
        where: { leaveDate: null, role: { in: ["JOUEUR", "SUB"] } },
        orderBy: { role: "asc" },
        include: { player: true },
      },
    },
  });
}

export function getTeam(id: string) {
  return db.team.findUnique({
    where: { id },
    include: { managers: { include: { user: true } } },
  });
}

export function createTeam(data: TeamInput, createdById: string) {
  return db.team.create({
    data: {
      name: data.name,
      tag: data.tag,
      region: data.region,
      description: data.description,
      status: data.status,
      socials: data.socials ?? undefined,
      createdById,
      // Le créateur est propriétaire d'emblée : sans ça une équipe naissait
      // sans aucun manager, et personne ne pouvait en administrer la gestion
      // hors administrateur du site.
      managers: { create: { userId: createdById, role: "OWNER" } },
    },
  });
}

export function updateTeam(id: string, data: TeamInput) {
  return db.team.update({
    where: { id },
    data: {
      name: data.name,
      tag: data.tag,
      region: data.region,
      description: data.description,
      status: data.status,
      socials: data.socials ?? undefined,
    },
  });
}

export function setTeamLogo(id: string, logoKey: string) {
  return db.team.update({ where: { id }, data: { logo: logoKey } });
}

export function deleteTeam(id: string) {
  return db.team.delete({ where: { id } });
}

/** Ajoute (ou conserve) un manager. Le niveau par défaut est le plus bas. */
export function addTeamManager(teamId: string, userId: string, role: ManagerRole = "MANAGER") {
  return db.teamManager.upsert({
    where: { teamId_userId: { teamId, userId } },
    create: { teamId, userId, role },
    update: {},
  });
}

export function removeTeamManager(teamId: string, userId: string) {
  return db.teamManager.deleteMany({ where: { teamId, userId } });
}

/**
 * Retire un manager, sauf s'il est le dernier propriétaire (ou le dernier
 * manager tout court). Lecture + suppression dans une transaction Serializable
 * → pas de course possible menant à une équipe orpheline.
 *
 * @returns false si le retrait a été refusé.
 */
export function removeTeamManagerIfNotLast(teamId: string, userId: string): Promise<boolean> {
  return db.$transaction(
    async (tx) => {
      const managers = await tx.teamManager.findMany({
        where: { teamId },
        select: { userId: true, role: true },
      });
      if (managers.length <= 1 || isLastOwner(managers, userId)) return false;
      await tx.teamManager.deleteMany({ where: { teamId, userId } });
      return true;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

/**
 * Change le niveau d'un manager. Rétrograder le dernier propriétaire est
 * refusé, pour la même raison que le retirer.
 *
 * @returns false si le changement a été refusé.
 */
export function setTeamManagerRole(
  teamId: string,
  userId: string,
  role: ManagerRole
): Promise<boolean> {
  return db.$transaction(
    async (tx) => {
      const managers = await tx.teamManager.findMany({
        where: { teamId },
        select: { userId: true, role: true },
      });
      if (role !== "OWNER" && isLastOwner(managers, userId)) return false;
      await tx.teamManager.updateMany({ where: { teamId, userId }, data: { role } });
      return true;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

/** Génère (ou régénère) le lien d'invitation de l'équipe : nouveau token + expiration TTL. */
export function generateTeamInvite(teamId: string) {
  const token = randomBytes(24).toString("base64url");
  const inviteExpiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
  return db.team.update({ where: { id: teamId }, data: { inviteToken: token, inviteExpiresAt } });
}

/** Révoque le lien d'invitation (token + expiration à null). */
export function revokeTeamInvite(teamId: string) {
  return db.team.update({
    where: { id: teamId },
    data: { inviteToken: null, inviteExpiresAt: null },
  });
}

/** Équipe correspondant à un token d'invitation (ou null). */
export function getTeamByInviteToken(token: string) {
  return db.team.findUnique({ where: { inviteToken: token } });
}

/** Équipes dont l'utilisateur est manager (pour l'inscription à un tournoi). */
export async function listTeamsManagedBy(userId: string) {
  const rows = await db.teamManager.findMany({
    where: { userId },
    include: { team: { select: { id: true, name: true, tag: true } } },
  });
  return rows
    .map((r) => r.team)
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

/** Joueurs actifs du roster (hors COACH / MANAGER), pour le seuil d'inscription. */
export function countActiveRosterPlayers(teamId: string): Promise<number> {
  return db.teamMembership.count({
    where: { teamId, leaveDate: null, role: { in: ["JOUEUR", "SUB"] } },
  });
}
