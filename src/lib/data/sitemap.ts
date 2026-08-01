import { db } from "@/lib/db";

export type SitemapEntry = { id: string; updatedAt: Date };

/**
 * Identifiants et dates de dernière modification des fiches publiques.
 *
 * Requête dédiée plutôt que réutilisation des `list*` de la couche données :
 * celles-ci ramènent les relations complètes (roster, participants, scores),
 * inutiles ici et coûteuses à l'échelle du sitemap entier.
 */
export async function listSitemapEntries(): Promise<{
  teams: SitemapEntry[];
  players: SitemapEntry[];
  tournaments: SitemapEntry[];
  matches: SitemapEntry[];
}> {
  const select = { id: true, updatedAt: true } as const;
  const [teams, players, tournaments, matches] = await Promise.all([
    db.team.findMany({ select }),
    db.player.findMany({ select }),
    db.tournament.findMany({ select }),
    db.match.findMany({ select }),
  ]);
  return { teams, players, tournaments, matches };
}
