import { randomBytes } from "node:crypto";
import { Prisma, type ManagerRole, type MembershipRole } from "@prisma/client";
import { db } from "@/lib/db";
import { isLastOwner } from "@/lib/permissions";
import { clampPage, pageOffset } from "@/lib/pagination";
import { attachRosterPlayer } from "@/lib/data/players";
import type { LfpFilters, LfpState } from "@/lib/lfp";
import type { TeamInput, RosterEntry } from "@/lib/validation/team";
import { INVITE_TTL_DAYS } from "@/lib/invite";

/**
 * Crée un roster initial pour une équipe.
 *
 * Chaque ligne réutilise une fiche d'archive du même pseudo si elle est libre,
 * plutôt que d'empiler une fiche de plus. L'invariant « une seule adhésion
 * active par joueur » tient : `findReusablePlayer` écarte les fiches déjà
 * engagées dans une équipe.
 */
export async function addInitialRoster(teamId: string, roster: RosterEntry[]): Promise<void> {
  if (roster.length === 0) return;
  await db.$transaction(async (tx) => {
    for (const entry of roster) {
      await attachRosterPlayer(tx, teamId, entry.pseudo, undefined, entry.role as MembershipRole);
    }
  });
}

export function listTeams(filters?: { region?: string }) {
  return db.team.findMany({
    where: filters?.region ? { region: filters.region } : undefined,
    orderBy: { name: "asc" },
  });
}

/** Équipes affichées par page sur /equipes. */
export const TEAMS_PER_PAGE = 24;

/**
 * Comme listTeams, mais avec le roster actif (hors staff) pour l'affichage
 * en cartes façon page tournoi (survol → joueurs).
 *
 * Paginée : chaque carte tire cinq joueurs, donc la version non bornée
 * chargeait tout l'annuaire des rosters du site à chaque affichage.
 */
export async function listTeamsWithRoster(filters?: { region?: string }, page = 1) {
  const where = filters?.region ? { region: filters.region } : undefined;

  const total = await db.team.count({ where });
  const current = clampPage(page, total, TEAMS_PER_PAGE);

  const teams = await db.team.findMany({
    where,
    orderBy: { name: "asc" },
    skip: pageOffset(current, TEAMS_PER_PAGE),
    take: TEAMS_PER_PAGE,
    include: {
      memberships: {
        where: { leaveDate: null, role: { in: ["JOUEUR", "SUB"] } },
        orderBy: { role: "asc" },
        // Les cartes n'affichent que cinq joueurs : inutile de remonter les
        // remplaçants au-delà.
        take: 5,
        include: { player: true },
      },
    },
  });

  return { teams, total, page: current, pageSize: TEAMS_PER_PAGE };
}

/**
 * Une autre équipe porte-t-elle déjà ce nom ou ce tag ? Comparaison insensible
 * à la casse : « FUT » et « fut » sont le même tag pour un lecteur.
 *
 * L'unicité est vérifiée ici plutôt que par une contrainte SQL : les jeux de
 * démonstration importent les mêmes équipes réelles depuis deux sources, et la
 * CI les joue tous les deux. Le besoin réel est d'avertir à la saisie, pas
 * d'interdire une donnée déjà en base.
 *
 * @returns le champ en conflit, ou null.
 */
export async function findTeamConflict(
  data: { name: string; tag: string },
  excludeTeamId?: string
): Promise<"name" | "tag" | null> {
  const clash = await db.team.findFirst({
    where: {
      ...(excludeTeamId ? { NOT: { id: excludeTeamId } } : {}),
      OR: [
        { name: { equals: data.name, mode: "insensitive" } },
        { tag: { equals: data.tag, mode: "insensitive" } },
      ],
    },
    select: { name: true, tag: true },
  });
  if (!clash) return null;
  return clash.name.toLowerCase() === data.name.toLowerCase() ? "name" : "tag";
}

/** Équipes en recherche de joueur affichées par page. */
export const LFP_PER_PAGE = 24;

/**
 * Équipes qui recrutent, les annonces les plus fraîches d'abord.
 *
 * Un filtre par poste retient aussi les équipes ouvertes à tous les rôles :
 * elles recrutent bel et bien à ce poste, elles ne l'ont simplement pas
 * restreint. Les exclure priverait le joueur de la moitié des annonces.
 */
export async function listLfpTeams(filters: LfpFilters, page = 1) {
  const where = {
    lfp: true,
    ...(filters.role
      ? { OR: [{ lfpRoles: { has: filters.role } }, { lfpRoles: { isEmpty: true } }] }
      : {}),
    ...(filters.q
      ? {
          AND: [
            {
              OR: [
                { name: { contains: filters.q, mode: "insensitive" as const } },
                { tag: { contains: filters.q, mode: "insensitive" as const } },
              ],
            },
          ],
        }
      : {}),
  };

  const total = await db.team.count({ where });
  const current = clampPage(page, total, LFP_PER_PAGE);

  const teams = await db.team.findMany({
    where,
    orderBy: [{ lfpSince: "desc" }, { name: "asc" }],
    skip: pageOffset(current, LFP_PER_PAGE),
    take: LFP_PER_PAGE,
    select: {
      id: true,
      name: true,
      tag: true,
      logo: true,
      region: true,
      lfpRoles: true,
      lfpMessage: true,
      _count: { select: { memberships: { where: { leaveDate: null } } } },
    },
  });

  return { teams, total, page: current, pageSize: LFP_PER_PAGE };
}

/** Applique un statut LFP calculé par `nextLfpState`. */
export function setTeamLfp(teamId: string, state: LfpState) {
  return db.team.update({
    where: { id: teamId },
    data: {
      lfp: state.lfp,
      lfpSince: state.lfpSince,
      lfpRoles: state.lfpRoles,
      lfpMessage: state.lfpMessage,
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
  return rows.map((r) => r.team).sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

/** Joueurs actifs du roster (hors COACH / MANAGER), pour le seuil d'inscription. */
export function countActiveRosterPlayers(teamId: string): Promise<number> {
  return db.teamMembership.count({
    where: { teamId, leaveDate: null, role: { in: ["JOUEUR", "SUB"] } },
  });
}
