import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { TournamentFormat, TournamentStatus } from "@/lib/constants";
import type { TournamentInput } from "@/lib/validation/tournament";

export function listTournaments(filters?: { region?: string; status?: string }) {
  return db.tournament.findMany({
    where: {
      ...(filters?.region ? { region: filters.region } : {}),
      ...(filters?.status ? { status: filters.status as TournamentStatus } : {}),
    },
    include: { _count: { select: { participants: true } } },
    orderBy: [{ startDate: "desc" }, { name: "asc" }],
  });
}

export function getTournament(id: string) {
  return db.tournament.findUnique({
    where: { id },
    include: {
      managers: { include: { user: true } },
      participants: { include: { team: true, group: true }, orderBy: { seed: "asc" } },
    },
  });
}

export function createTournament(data: TournamentInput, createdById: string) {
  return db.tournament.create({
    data: {
      name: data.name,
      region: data.region,
      format: data.format as TournamentFormat,
      status: data.status as TournamentStatus,
      startDate: data.startDate,
      endDate: data.endDate,
      prizePool: data.prizePool,
      organizer: data.organizer,
      description: data.description,
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
      status: data.status as TournamentStatus,
      startDate: data.startDate ?? null,
      endDate: data.endDate ?? null,
      prizePool: data.prizePool ?? null,
      organizer: data.organizer ?? null,
      description: data.description ?? null,
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
