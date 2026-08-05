import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { listSitemapEntries } from "@/lib/data/sitemap";

/** Pages fixes, hors sections réservées (voir robots.ts). */
const STATIC_ROUTES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/tournois", changeFrequency: "daily", priority: 0.9 },
  { path: "/matchs", changeFrequency: "daily", priority: 0.9 },
  { path: "/equipes", changeFrequency: "weekly", priority: 0.8 },
  { path: "/joueurs", changeFrequency: "daily", priority: 0.8 },
  { path: "/lft", changeFrequency: "daily", priority: 0.7 },
  { path: "/recherche", changeFrequency: "monthly", priority: 0.3 },
  { path: "/mentions-legales", changeFrequency: "yearly", priority: 0.2 },
  { path: "/confidentialite", changeFrequency: "yearly", priority: 0.2 },
  { path: "/cgu", changeFrequency: "yearly", priority: 0.2 },
];

/**
 * Sans `force-dynamic`, Next traite `sitemap.ts` comme un Route Handler mis en
 * cache et le prérend pendant `next build`. Le build irait alors interroger la
 * base — impossible en CI, où `DATABASE_URL` est volontairement factice, et de
 * toute façon indésirable : le sitemap serait figé sur l'état du catalogue au
 * moment de la compilation.
 */
export const dynamic = "force-dynamic";

/**
 * Le contenu différenciant du site est dans les fiches profondes (un match d'un
 * tournoi terminé). Sans sitemap, leur découverte dépendait uniquement du
 * maillage interne.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { teams, players, tournaments, matches } = await listSitemapEntries();

  const now = new Date();
  const statics = STATIC_ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  const collection = (
    prefix: string,
    entries: Array<{ id: string; updatedAt: Date }>,
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
    priority: number
  ) =>
    entries.map((e) => ({
      url: `${SITE_URL}${prefix}/${e.id}`,
      lastModified: e.updatedAt,
      changeFrequency,
      priority,
    }));

  return [
    ...statics,
    ...collection("/tournois", tournaments, "weekly", 0.8),
    ...collection("/matchs", matches, "weekly", 0.7),
    ...collection("/equipes", teams, "weekly", 0.7),
    ...collection("/joueurs", players, "weekly", 0.6),
  ];
}
