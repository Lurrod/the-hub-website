import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { TournamentFormat, TournamentStatus } from "@/lib/constants";
import type { TournamentInput } from "@/lib/validation/tournament";
import { isTournamentOver, syncFinishedTournaments } from "@/lib/tournament-status";

/** Le statut saisi, forcé à "FINISHED" si la date de fin est déjà dépassée. */
function effectiveStatus(data: TournamentInput): TournamentStatus {
  const endDate = data.endDate ?? null;
  return isTournamentOver({ endDate }) ? "FINISHED" : (data.status as TournamentStatus);
}

export async function listTournaments(filters?: { region?: string; status?: string }) {
  await syncFinishedTournaments();

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
  await syncFinishedTournaments();

  return db.tournament.findMany({
    where: { participants: { some: { teamId } } },
    include: { _count: { select: { participants: true } } },
    orderBy: [{ startDate: "desc" }, { name: "asc" }],
  });
}

export async function getTournament(id: string) {
  await syncFinishedTournaments();

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
      createdById,
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

export function addParticipant(tournamentId: string, teamId: string, seed?: number) {
  return db.tournamentParticipant.upsert({
    where: { tournamentId_teamId: { tournamentId, teamId } },
    create: { tournamentId, teamId, seed },
    update: { seed },
  });
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

export function addTournamentManager(tournamentId: string, userId: string) {
  return db.tournamentManager.upsert({
    where: { tournamentId_userId: { tournamentId, userId } },
    create: { tournamentId, userId },
    update: {},
  });
}

export function removeTournamentManager(tournamentId: string, userId: string) {
  return db.tournamentManager.deleteMany({ where: { tournamentId, userId } });
}

/**
 * Retire un manager UNIQUEMENT s'il n'est pas le dernier du tournoi.
 * Comptage + suppression dans une transaction Serializable → pas de course
 * possible menant à un tournoi orphelin. Retourne false si c'était le dernier.
 */
export function removeTournamentManagerIfNotLast(
  tournamentId: string,
  userId: string
): Promise<boolean> {
  return db.$transaction(
    async (tx) => {
      const count = await tx.tournamentManager.count({ where: { tournamentId } });
      if (count <= 1) return false;
      await tx.tournamentManager.deleteMany({ where: { tournamentId, userId } });
      return true;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}
