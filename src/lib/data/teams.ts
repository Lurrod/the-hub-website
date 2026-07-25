import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import type { TeamInput } from "@/lib/validation/team";
import { INVITE_TTL_DAYS } from "@/lib/invite";

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
