import { db } from "@/lib/db";
import { finishedCutoff } from "@/lib/tournament-status";

/**
 * Décomptes affichés sur les images de partage des pages de liste.
 *
 * Ces requêtes vivaient dans les `opengraph-image.tsx` eux-mêmes, seuls
 * fichiers de `src/app/` à ouvrir Prisma directement en dehors des server
 * actions. Elles sont trop petites pour mériter chacune leur module, mais pas
 * pour justifier une exception à la règle : la couche données porte les
 * requêtes.
 */

export function countTeams(): Promise<number> {
  return db.team.count();
}

export function countPlayers(): Promise<number> {
  return db.player.count();
}

export function countPlayersLookingForTeam(): Promise<number> {
  return db.player.count({ where: { lft: true } });
}

export function countFinishedMatches(): Promise<number> {
  return db.match.count({ where: { status: "FINISHED" } });
}

/** Moyennes de carrière d'un joueur, `null` tant qu'aucune carte n'est enregistrée. */
export async function playerCareerAverages(playerId: string) {
  const agg = await db.playerGameStat.aggregate({
    where: { playerId },
    _avg: { rating: true, acs: true },
    _sum: { kills: true, deaths: true },
    _count: { _all: true },
  });
  if (agg._count._all === 0) return null;
  return {
    maps: agg._count._all,
    rating: agg._avg.rating ?? 0,
    acs: agg._avg.acs ?? 0,
    kills: agg._sum.kills ?? 0,
    deaths: agg._sum.deaths ?? 0,
  };
}

/**
 * Tournois au total, et parmi eux ceux réellement en cours.
 *
 * Même règle que `syncTournamentStatuses`, sans l'écriture : une carte de
 * partage ne doit pas modifier la base pour afficher un chiffre. D'où le
 * rattrapage des tournois commencés dont le statut n'a pas encore été recalé,
 * au même titre que ceux déjà marqués « en cours ».
 */
export function countTournaments(): Promise<[number, number]> {
  const cutoff = finishedCutoff();
  return Promise.all([
    db.tournament.count(),
    db.tournament.count({
      where: {
        OR: [{ endDate: null }, { endDate: { gte: cutoff } }],
        AND: [
          {
            OR: [{ status: "ONGOING" }, { status: "UPCOMING", startDate: { lte: cutoff } }],
          },
        ],
      },
    }),
  ]);
}
