import { db } from "@/lib/db";
import type { TournamentStatus } from "@/lib/constants";

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
 * Vrai si le coup d'envoi est passé. Même convention que `isTournamentOver` :
 * la date vient d'un `<input type="date">`, un tournoi qui démarre aujourd'hui
 * a donc déjà commencé.
 */
export function hasTournamentStarted(
  tournament: Readonly<{ startDate: Date | null }>,
  now?: Date
): boolean {
  return tournament.startDate !== null && tournament.startDate <= finishedCutoff(now);
}

export type TournamentDates = Readonly<{
  status: TournamentStatus;
  startDate: Date | null;
  endDate: Date | null;
}>;

/**
 * Statut que le tournoi devrait porter compte tenu de ses dates.
 *
 * Seules les deux bascules « en avant » sont automatiques : à venir → en cours
 * au coup d'envoi, puis → terminé à la date de fin. Sans la première, un
 * tournoi restait « À venir » pendant toute sa durée tant qu'un organisateur ne
 * changeait pas le statut à la main, et les inscriptions restaient donc
 * ouvertes en pleins playoffs.
 */
export function nextTournamentStatus(t: TournamentDates, now?: Date): TournamentStatus {
  if (isTournamentOver(t, now)) return "FINISHED";
  if (t.status === "UPCOMING" && hasTournamentStarted(t, now)) return "ONGOING";
  return t.status;
}

/**
 * Une équipe peut-elle encore s'inscrire ? La règle porte sur les dates autant
 * que sur le statut : le statut peut être en retard d'une synchronisation, les
 * dates non.
 */
export function isRegistrationOpen(t: TournamentDates, now?: Date): boolean {
  return nextTournamentStatus(t, now) === "UPCOMING";
}

/**
 * Recale en base le statut des tournois dont les dates ont été franchies :
 * ceux qui viennent de commencer passent « En cours », ceux dont la date de fin
 * est dépassée passent « Terminé ».
 *
 * @returns le nombre de tournois mis à jour.
 */
export async function syncTournamentStatuses(): Promise<number> {
  const cutoff = finishedCutoff();

  const [finished, ongoing] = await db.$transaction([
    db.tournament.updateMany({
      where: { endDate: { lt: cutoff }, status: { not: "FINISHED" } },
      data: { status: "FINISHED" },
    }),
    db.tournament.updateMany({
      where: {
        status: "UPCOMING",
        startDate: { lte: cutoff },
        OR: [{ endDate: null }, { endDate: { gte: cutoff } }],
      },
      data: { status: "ONGOING" },
    }),
  ]);

  return finished.count + ongoing.count;
}
