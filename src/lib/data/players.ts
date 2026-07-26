import { db } from "@/lib/db";
import type { PlayerInput } from "@/lib/validation/player";
import type { MembershipRole } from "@prisma/client";
import type { RiotAccount } from "@/lib/henrikdev";

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

/** Enregistre le compte Riot vérifié sur un joueur. */
export function setPlayerRiotAccount(playerId: string, account: RiotAccount) {
  return db.player.update({
    where: { id: playerId },
    data: {
      riotName: account.name,
      riotTag: account.tag,
      puuid: account.puuid,
      region: account.region,
    },
  });
}

/** True si ce puuid est déjà pris par un AUTRE joueur. */
export async function isPuuidTakenByOther(puuid: string, excludePlayerId?: string): Promise<boolean> {
  const clash = await db.player.findFirst({
    where: { puuid, ...(excludePlayerId ? { NOT: { id: excludePlayerId } } : {}) },
    select: { id: true },
  });
  return clash !== null;
}

/** Fiche Player liée à un compte user (ou null). */
export function getPlayerByUserId(userId: string) {
  return db.player.findUnique({ where: { userId } });
}

/**
 * Garantit une fiche Player pour ce user : la crée si absente.
 * pseudo par défaut = nom Discord (ou "Joueur"), photo = avatar Discord.
 */
export async function ensurePlayerForUser(
  userId: string,
  fallback: { pseudo?: string | null; photo?: string | null }
) {
  const existing = await db.player.findUnique({ where: { userId } });
  if (existing) return existing;
  return db.player.create({
    data: {
      userId,
      pseudo: fallback.pseudo?.trim() || "Joueur",
      photo: fallback.photo ?? undefined,
    },
  });
}

/** Adhésion active (leaveDate null) d'un joueur, avec l'équipe. */
export function getActiveMembership(playerId: string) {
  return db.teamMembership.findFirst({
    where: { playerId, leaveDate: null },
    include: { team: true },
  });
}

/** Ajoute un joueur au roster d'une équipe (rôle JOUEUR par défaut). */
export function addPlayerToTeam(
  teamId: string,
  playerId: string,
  role: MembershipRole = "JOUEUR"
) {
  return db.teamMembership.create({ data: { teamId, playerId, role } });
}

/**
 * Rejoint une équipe de façon atomique : dans une transaction, vérifie
 * l'absence d'adhésion active puis crée l'adhésion. Protège l'invariant
 * « une seule équipe active » (§1.4) contre les courses (double-clic, onglets).
 * Retourne `{ ok: false, activeTeamId }` si le joueur a déjà une équipe active.
 */
export function joinTeamIfFree(
  teamId: string,
  playerId: string,
  role: MembershipRole = "JOUEUR"
): Promise<{ ok: true } | { ok: false; activeTeamId: string }> {
  return db.$transaction(async (tx) => {
    const active = await tx.teamMembership.findFirst({
      where: { playerId, leaveDate: null },
      select: { teamId: true },
    });
    if (active) return { ok: false as const, activeTeamId: active.teamId };
    await tx.teamMembership.create({ data: { teamId, playerId, role } });
    return { ok: true as const };
  });
}
