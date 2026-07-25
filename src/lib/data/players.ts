import { db } from "@/lib/db";
import type { PlayerInput } from "@/lib/validation/player";
import type { MembershipRole } from "@prisma/client";

export function listPlayers() {
  return db.player.findMany({ orderBy: { pseudo: "asc" } });
}

export function getPlayer(id: string) {
  return db.player.findUnique({
    where: { id },
    include: {
      memberships: { include: { team: true }, orderBy: { joinDate: "desc" } },
    },
  });
}

export function createPlayer(data: PlayerInput) {
  return db.player.create({
    data: {
      pseudo: data.pseudo,
      realName: data.realName,
      nationality: data.nationality,
      socials: data.socials ?? undefined,
    },
  });
}

export function updatePlayer(id: string, data: PlayerInput) {
  return db.player.update({
    where: { id },
    data: {
      pseudo: data.pseudo,
      realName: data.realName,
      nationality: data.nationality,
      socials: data.socials ?? undefined,
    },
  });
}

export function setPlayerPhoto(id: string, photoKey: string) {
  return db.player.update({ where: { id }, data: { photo: photoKey } });
}

export function deletePlayer(id: string) {
  return db.player.delete({ where: { id } });
}

/** Roster actuel d'une équipe (memberships non terminés). */
export function getTeamRoster(teamId: string) {
  return db.teamMembership.findMany({
    where: { teamId, leaveDate: null },
    include: { player: true },
    orderBy: [{ role: "asc" }, { joinDate: "asc" }],
  });
}

/** Anciens joueurs d'une équipe (memberships terminés). */
export function getTeamAlumni(teamId: string) {
  return db.teamMembership.findMany({
    where: { teamId, leaveDate: { not: null } },
    include: { player: true },
    orderBy: { leaveDate: "desc" },
  });
}

export function getMembership(id: string) {
  return db.teamMembership.findUnique({ where: { id } });
}

/** Crée un joueur ET l'ajoute au roster de l'équipe (transaction). */
export function createPlayerAndAddToRoster(
  teamId: string,
  pseudo: string,
  nationality: string | undefined,
  role: MembershipRole
) {
  return db.$transaction(async (tx) => {
    const player = await tx.player.create({ data: { pseudo, nationality } });
    await tx.teamMembership.create({ data: { teamId, playerId: player.id, role } });
    return player;
  });
}

export function setMembershipRole(id: string, role: MembershipRole) {
  return db.teamMembership.update({ where: { id }, data: { role } });
}

/** Termine un passage dans l'équipe (garde l'historique). */
export function endMembership(id: string, when: Date) {
  return db.teamMembership.update({ where: { id }, data: { leaveDate: when } });
}

export function deleteMembership(id: string) {
  return db.teamMembership.delete({ where: { id } });
}
