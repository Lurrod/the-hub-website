import { db } from "@/lib/db";
import { matchFicheName } from "@/lib/slug";

export type SitemapEntry = { id: string; updatedAt: Date; nom: string };

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
  // Le nom est lu en plus de l'identifiant : le sitemap doit émettre la forme
  // canonique `<slug>-<id>`, sinon il déclare 440 URLs qui redirigent toutes
  // en 301 — un sitemap ne doit contenir que des destinations finales.
  const [teams, players, tournaments, matches] = await Promise.all([
    db.team.findMany({ select: { id: true, updatedAt: true, name: true } }),
    db.player.findMany({ select: { id: true, updatedAt: true, pseudo: true } }),
    db.tournament.findMany({ select: { id: true, updatedAt: true, name: true } }),
    db.match.findMany({
      select: {
        id: true,
        updatedAt: true,
        teamA: { select: { name: true } },
        teamB: { select: { name: true } },
      },
    }),
  ]);
  return {
    teams: teams.map((t) => ({ id: t.id, updatedAt: t.updatedAt, nom: t.name })),
    players: players.map((p) => ({ id: p.id, updatedAt: p.updatedAt, nom: p.pseudo })),
    tournaments: tournaments.map((t) => ({ id: t.id, updatedAt: t.updatedAt, nom: t.name })),
    matches: matches.map((m) => ({
      id: m.id,
      updatedAt: m.updatedAt,
      nom: matchFicheName(m.teamA.name, m.teamB.name),
    })),
  };
}
