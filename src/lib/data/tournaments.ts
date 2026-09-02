import { Prisma, type ManagerRole } from "@prisma/client";
import { db } from "@/lib/db";
import { isLastOwner } from "@/lib/permissions";
import type { TournamentFormat, TournamentStatus } from "@/lib/constants";
import type { TournamentInput } from "@/lib/validation/tournament";
import { nextTournamentStatus } from "@/lib/tournament-status";
import { syncTournamentStatusesIfStale } from "@/lib/data/tournament-status";

/** Le statut saisi, recalé sur les dates (démarré → en cours, fini → terminé). */
function effectiveStatus(data: TournamentInput): TournamentStatus {
  return nextTournamentStatus({
    status: data.status as TournamentStatus,
    startDate: data.startDate ?? null,
    endDate: data.endDate ?? null,
  });
}

export async function listTournaments(filters?: { region?: string; status?: string }) {
  await syncTournamentStatusesIfStale();

  return db.tournament.findMany({
    where: {
      ...(filters?.region ? { region: filters.region } : {}),
      ...(filters?.status ? { status: filters.status as TournamentStatus } : {}),
    },
    include: { _count: { select: { participants: true } } },
    orderBy: [{ startDate: "desc" }, { name: "asc" }],
  });
}

/** Tournois auxquels une équipe est (ou a été) inscrite, plus récents d'abord. */
export async function getTeamTournaments(teamId: string) {
  await syncTournamentStatusesIfStale();

  return db.tournament.findMany({
    where: { participants: { some: { teamId } } },
    include: { _count: { select: { participants: true } } },
    orderBy: [{ startDate: "desc" }, { name: "asc" }],
  });
}

export async function getTournament(id: string) {
  await syncTournamentStatusesIfStale();

  return db.tournament.findUnique({
    where: { id },
    include: {
      managers: { include: { user: true } },
      participants: { include: { team: true, group: true }, orderBy: { seed: "asc" } },
    },
  });
}

/** Équipes inscrites avec leur roster actif (pour les cartes participantes). */
export function getTournamentTeamsWithPlayers(tournamentId: string) {
  return db.tournamentParticipant.findMany({
    where: { tournamentId },
    orderBy: [{ seed: "asc" }],
    include: {
      team: {
        include: {
          memberships: {
            where: { leaveDate: null },
            orderBy: { role: "asc" },
            include: { player: true },
          },
        },
      },
    },
  });
}

export function createTournament(data: TournamentInput, createdById: string) {
  return db.tournament.create({
    data: {
      name: data.name,
      region: data.region,
      format: data.format as TournamentFormat,
      status: effectiveStatus(data),
      startDate: data.startDate,
      endDate: data.endDate,
      prizePool: data.prizePool,
      organizer: data.organizer,
      description: data.description,
      maxTeams: data.maxTeams,
      groupSize: data.groupSize,
      bestOf: data.bestOf,
      seeding: data.seeding,
      socials: data.socials ?? undefined,
      createdById,
      // Le créateur est propriétaire d'emblée : sans ça un tournoi naissait
      // sans aucun manager, et personne ne pouvait en administrer la gestion
      // hors administrateur du site.
      managers: { create: { userId: createdById, role: "OWNER" } },
    },
  });
}

export function updateTournament(id: string, data: TournamentInput) {
  return db.tournament.update({
    where: { id },
    data: {
      name: data.name,
      region: data.region,
      format: data.format as TournamentFormat,
      status: effectiveStatus(data),
      startDate: data.startDate ?? null,
      endDate: data.endDate ?? null,
      prizePool: data.prizePool ?? null,
      organizer: data.organizer ?? null,
      description: data.description ?? null,
      maxTeams: data.maxTeams ?? null,
      groupSize: data.groupSize ?? null,
      bestOf: data.bestOf ?? null,
      seeding: data.seeding ?? null,
      socials: data.socials ?? undefined,
    },
  });
}

export function setTournamentLogo(id: string, logoKey: string) {
  return db.tournament.update({ where: { id }, data: { logo: logoKey } });
}

export function setTournamentBanner(id: string, bannerKey: string) {
  return db.tournament.update({ where: { id }, data: { banner: bannerKey } });
}

export function deleteTournament(id: string) {
  return db.tournament.delete({ where: { id } });
}

/**
 * Inscrit (ou met à jour) un participant, en refusant un seed déjà occupé.
 *
 * Vérification et écriture dans la même transaction Serializable : la version
 * précédente lisait puis écrivait sans transaction, et deux ajouts simultanés
 * pouvaient attribuer le même seed à deux équipes. Il n'y a pas de contrainte
 * SQL pour rattraper ça — les jeux de démonstration numérotent les seeds par
 * poule, donc en double au sein d'un tournoi.
 *
 * `seed` distingue trois cas : un nombre le pose, `null` l'efface, `undefined`
 * le laisse tel quel — c'est ce dernier qui permet de réinscrire une équipe
 * sans perdre son placement.
 *
 * @returns false si le seed est déjà pris par une autre équipe.
 */
export function addParticipant(
  tournamentId: string,
  teamId: string,
  seed?: number | null
): Promise<boolean> {
  return db.$transaction(
    async (tx) => {
      if (seed != null) {
        const clash = await tx.tournamentParticipant.findFirst({
          where: { tournamentId, seed, NOT: { teamId } },
          select: { id: true },
        });
        if (clash) return false;
      }
      await tx.tournamentParticipant.upsert({
        where: { tournamentId_teamId: { tournamentId, teamId } },
        create: { tournamentId, teamId, seed },
        update: { seed },
      });
      return true;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

export function removeParticipant(tournamentId: string, teamId: string) {
  // Retirer une équipe supprime aussi ses matchs dans CE tournoi, sinon des
  // matchs orphelins resteraient affichés alors que l'équipe n'est plus inscrite.
  return db.$transaction([
    db.match.deleteMany({
      where: { tournamentId, OR: [{ teamAId: teamId }, { teamBId: teamId }] },
    }),
    db.tournamentParticipant.deleteMany({ where: { tournamentId, teamId } }),
  ]);
}

/** Ajoute (ou conserve) un manager. Le niveau par défaut est le plus bas. */
export function addTournamentManager(
  tournamentId: string,
  userId: string,
  role: ManagerRole = "MANAGER"
) {
  return db.tournamentManager.upsert({
    where: { tournamentId_userId: { tournamentId, userId } },
    create: { tournamentId, userId, role },
    update: {},
  });
}

export function removeTournamentManager(tournamentId: string, userId: string) {
  return db.tournamentManager.deleteMany({ where: { tournamentId, userId } });
}

/**
 * Retire un manager, sauf s'il est le dernier propriétaire (ou le dernier
 * manager tout court). Transaction Serializable → pas de course menant à un
 * tournoi orphelin.
 *
 * @returns false si le retrait a été refusé.
 */
export function removeTournamentManagerIfNotLast(
  tournamentId: string,
  userId: string
): Promise<boolean> {
  return db.$transaction(
    async (tx) => {
      const managers = await tx.tournamentManager.findMany({
        where: { tournamentId },
        select: { userId: true, role: true },
      });
      if (managers.length <= 1 || isLastOwner(managers, userId)) return false;
      await tx.tournamentManager.deleteMany({ where: { tournamentId, userId } });
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
export function setTournamentManagerRole(
  tournamentId: string,
  userId: string,
  role: ManagerRole
): Promise<boolean> {
  return db.$transaction(
    async (tx) => {
      const managers = await tx.tournamentManager.findMany({
        where: { tournamentId },
        select: { userId: true, role: true },
      });
      if (role !== "OWNER" && isLastOwner(managers, userId)) return false;
      await tx.tournamentManager.updateMany({ where: { tournamentId, userId }, data: { role } });
      return true;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

/**
 * Format d'un tournoi, seul champ dont les actions ont besoin pour valider une
 * étape ou l'existence de poules.
 */
export function getTournamentFormat(
  tournamentId: string
): Promise<{ format: TournamentFormat } | null> {
  return db.tournament.findUnique({ where: { id: tournamentId }, select: { format: true } });
}

/** Cette poule appartient-elle bien à ce tournoi ? */
export async function groupBelongsToTournament(
  groupId: string,
  tournamentId: string
): Promise<boolean> {
  const group = await db.group.findUnique({
    where: { id: groupId },
    select: { tournamentId: true },
  });
  return group?.tournamentId === tournamentId;
}

/** Combien des équipes citées sont inscrites à ce tournoi. */
export function countRegisteredAmong(tournamentId: string, teamIds: string[]): Promise<number> {
  return db.tournamentParticipant.count({
    where: { tournamentId, teamId: { in: teamIds } },
  });
}

/** Ce qu'il faut savoir du tournoi pour décider d'une inscription. */
export function getTournamentRegistrationInfo(tournamentId: string) {
  return db.tournament.findUnique({
    where: { id: tournamentId },
    select: { status: true, maxTeams: true, startDate: true, endDate: true },
  });
}

/** Cette équipe est-elle déjà inscrite ? */
export async function isTeamRegistered(tournamentId: string, teamId: string): Promise<boolean> {
  const existing = await db.tournamentParticipant.findUnique({
    where: { tournamentId_teamId: { tournamentId, teamId } },
    select: { id: true },
  });
  return existing !== null;
}

/** Levée dans la transaction quand la limite d'équipes est atteinte. */
const COMPLET = "TOURNAMENT_FULL";

/**
 * Inscrit l'équipe si la limite n'est pas atteinte.
 *
 * Le comptage et l'insertion sont dans la même transaction : sans ça, deux
 * inscriptions simultanées pourraient toutes deux passer la limite.
 *
 * Le sentinelle de dépassement ne traverse pas la frontière — l'appelant reçoit
 * un booléen, pas une erreur à reconnaître au message.
 *
 * @returns false si le tournoi était complet.
 */
export async function registerTeamIfRoom(
  tournamentId: string,
  teamId: string,
  maxTeams: number | null
): Promise<boolean> {
  try {
    await db.$transaction(async (tx) => {
      const count = await tx.tournamentParticipant.count({ where: { tournamentId } });
      if (maxTeams != null && count >= maxTeams) throw new Error(COMPLET);
      await tx.tournamentParticipant.create({ data: { tournamentId, teamId } });
    });
    return true;
  } catch (error: unknown) {
    if (error instanceof Error && error.message === COMPLET) return false;
    throw error;
  }
}
