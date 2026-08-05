/**
 * Recale le statut des tournois d'après leurs dates, hors de tout trafic web.
 *
 * Les lectures du site déclenchent le même recalage, mais au plus une fois
 * toutes les cinq minutes (voir `syncTournamentStatusesIfStale`). Ce script est
 * prévu pour une tâche planifiée quotidienne : un site sans visite entre deux
 * journées y trouve ses bascules faites malgré tout.
 *
 * Lancer :  npm run db:sync:tournaments
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

/** Copie de `finishedCutoff` : minuit UTC du jour courant. */
function cutoff(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

async function main() {
  const at = cutoff();

  const finished = await db.tournament.updateMany({
    where: { endDate: { lt: at }, status: { not: "FINISHED" } },
    data: { status: "FINISHED" },
  });
  const ongoing = await db.tournament.updateMany({
    where: {
      status: "UPCOMING",
      startDate: { lte: at },
      OR: [{ endDate: null }, { endDate: { gte: at } }],
    },
    data: { status: "ONGOING" },
  });

  console.log(
    JSON.stringify({
      event: "tournament.status.sync",
      time: new Date().toISOString(),
      finished: finished.count,
      ongoing: ongoing.count,
    })
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
