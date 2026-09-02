import { db } from "@/lib/db";
import { finishedCutoff, shouldSync } from "@/lib/tournament-status";

/**
 * Recalage en base du statut des tournois.
 *
 * Séparé de `src/lib/tournament-status.ts`, qui ne garde que les décisions
 * pures — celles qui se testent sans base et qui donnent au module son taux de
 * couverture. Ce fichier-ci écrit, il a donc sa place dans la couche données
 * comme n'importe quelle autre requête.
 */

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

let lastSyncAt = 0;

/**
 * Recalage paresseux, appelé par les lectures de tournoi.
 *
 * Le compteur est en mémoire du process : au pire un redémarrage relance une
 * synchronisation, ce qui est sans conséquence. Rien de critique n'en dépend —
 * l'ouverture des inscriptions est décidée par `isRegistrationOpen`, qui lit
 * les dates et non le statut stocké. Pour un recalage garanti hors trafic, le
 * script `npm run db:sync:tournaments` est fait pour une tâche planifiée.
 */
export async function syncTournamentStatusesIfStale(): Promise<void> {
  const now = Date.now();
  if (!shouldSync(lastSyncAt, now)) return;
  lastSyncAt = now;
  await syncTournamentStatuses();
}

/** Force le prochain appel paresseux à retravailler. Réservé aux tests. */
export function resetSyncThrottle(): void {
  lastSyncAt = 0;
}
