import { db } from "@/lib/db";
import type { TeamInput } from "@/lib/validation/team";

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
