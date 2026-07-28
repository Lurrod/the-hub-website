import { randomBytes } from "node:crypto";
import { Prisma, type MembershipRole } from "@prisma/client";
import { db } from "@/lib/db";
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

export function addTeamManager(teamId: string, userId: string) {
  return db.teamManager.upsert({
    where: { teamId_userId: { teamId, userId } },
    create: { teamId, userId },
    update: {},
  });
}

export function removeTeamManager(teamId: string, userId: string) {
  return db.teamManager.deleteMany({ where: { teamId, userId } });
}

/**
 * Retire un manager UNIQUEMENT s'il n'est pas le dernier de l'équipe.
 * Comptage + suppression dans une transaction Serializable → pas de course
 * possible menant à une équipe orpheline. Retourne false si c'était le dernier.
 */
export function removeTeamManagerIfNotLast(teamId: string, userId: string): Promise<boolean> {
  return db.$transaction(
    async (tx) => {
      const count = await tx.teamManager.count({ where: { teamId } });
      if (count <= 1) return false;
      await tx.teamManager.deleteMany({ where: { teamId, userId } });
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
