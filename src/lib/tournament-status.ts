import { db } from "@/lib/db";

/**
 * Instant à partir duquel une date de fin est considérée comme dépassée :
 * minuit UTC du jour courant. Les dates viennent d'un `<input type="date">`
 * (donc minuit UTC), un tournoi qui se termine aujourd'hui reste donc en cours
 * jusqu'à la fin de la journée.
 */
export function finishedCutoff(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Vrai si la date de fin du tournoi est dépassée. */
export function isTournamentOver(
  tournament: Readonly<{ endDate: Date | null }>,
  now?: Date
): boolean {
  return tournament.endDate !== null && tournament.endDate < finishedCutoff(now);
}

/**
 * Bascule en "FINISHED" tous les tournois dont la date de fin est dépassée.
 * Appelé avant chaque lecture de tournoi pour que le statut affiché, les
 * filtres et les inscriptions restent cohérents.
 *
 * @returns le nombre de tournois mis à jour.
 */
export async function syncFinishedTournaments(): Promise<number> {
  const { count } = await db.tournament.updateMany({
    where: {
      endDate: { lt: finishedCutoff() },
      status: { not: "FINISHED" },
    },
    data: { status: "FINISHED" },
  });

  return count;
}
