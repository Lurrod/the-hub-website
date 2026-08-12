import { db } from "@/lib/db";
import { dayOf } from "@/lib/audience";

/**
 * Écritures et lectures des compteurs d'audience.
 *
 * Une page vue coûte deux `upsert` et une insertion conditionnelle. C'est
 * volontairement fait en base plutôt qu'en mémoire : le serveur peut être
 * redémarré à tout moment par un déploiement, et un compteur en mémoire
 * perdrait la journée en cours.
 */

/** Jours conservés dans `AudienceVisitor`. Au-delà, le total suffit. */
const VISITOR_RETENTION_DAYS = 3;

/**
 * Enregistre une page vue.
 *
 * `visitors` n'est incrémenté qu'à la première apparition d'une empreinte dans
 * la journée : l'insertion sert de verrou, et c'est la base qui tranche la
 * course entre deux onglets ouverts en même temps.
 *
 * @returns `true` si le visiteur était nouveau pour la journée.
 */
export async function recordView(path: string, hash: string, now = new Date()): Promise<boolean> {
  const day = dayOf(now);

  const inserted = await db.audienceVisitor.createMany({
    data: [{ day, hash }],
    skipDuplicates: true,
  });
  const nouveau = inserted.count > 0;

  await Promise.all([
    db.audiencePage.upsert({
      where: { day_path: { day, path } },
      create: { day, path, views: 1 },
      update: { views: { increment: 1 } },
    }),
    db.audienceDay.upsert({
      where: { day },
      create: { day, views: 1, visitors: nouveau ? 1 : 0 },
      update: { views: { increment: 1 }, visitors: { increment: nouveau ? 1 : 0 } },
    }),
  ]);

  return nouveau;
}

/** Supprime les empreintes trop anciennes pour servir encore à dédoublonner. */
export function purgeOldVisitors(now = new Date()) {
  const limite = dayOf(now);
  limite.setUTCDate(limite.getUTCDate() - VISITOR_RETENTION_DAYS);
  return db.audienceVisitor.deleteMany({ where: { day: { lt: limite } } });
}

export type AudiencePoint = { day: Date; views: number; visitors: number };

export type AudienceSummary = {
  /** Un point par jour sur la fenêtre demandée, jours creux compris. */
  serie: AudiencePoint[];
  /** Totaux sur la fenêtre. */
  views: number;
  visitors: number;
  /** Mêmes totaux sur la fenêtre précédente, pour situer la tendance. */
  previousViews: number;
  /** Pages les plus vues sur la fenêtre. */
  topPages: { path: string; views: number }[];
  /** Jour le plus fréquenté de la fenêtre, s'il y a eu du trafic. */
  best: AudiencePoint | null;
};

/** Nombre de pages listées dans le classement. */
const TOP_PAGES = 8;

/**
 * Résumé d'audience sur les `days` derniers jours, aujourd'hui compris.
 *
 * La série est complétée à zéro pour les journées sans trafic : un graphique
 * qui saute les jours creux donne à lire une régularité qui n'existe pas.
 */
export async function getAudienceSummary(days = 30, now = new Date()): Promise<AudienceSummary> {
  const today = dayOf(now);
  const from = new Date(today);
  from.setUTCDate(from.getUTCDate() - (days - 1));
  const previousFrom = new Date(from);
  previousFrom.setUTCDate(previousFrom.getUTCDate() - days);

  const [rows, previous, pages] = await Promise.all([
    db.audienceDay.findMany({ where: { day: { gte: from } }, orderBy: { day: "asc" } }),
    db.audienceDay.aggregate({
      where: { day: { gte: previousFrom, lt: from } },
      _sum: { views: true },
    }),
    db.audiencePage.groupBy({
      by: ["path"],
      where: { day: { gte: from } },
      _sum: { views: true },
      orderBy: { _sum: { views: "desc" } },
      take: TOP_PAGES,
    }),
  ]);

  const parJour = new Map(rows.map((r) => [r.day.toISOString().slice(0, 10), r]));
  const serie: AudiencePoint[] = [];
  for (let i = 0; i < days; i += 1) {
    const day = new Date(from);
    day.setUTCDate(day.getUTCDate() + i);
    const row = parJour.get(day.toISOString().slice(0, 10));
    serie.push({ day, views: row?.views ?? 0, visitors: row?.visitors ?? 0 });
  }

  const best = serie.reduce<AudiencePoint | null>(
    (a, p) => (p.views > 0 && (!a || p.views > a.views) ? p : a),
    null
  );

  return {
    serie,
    views: serie.reduce((n, p) => n + p.views, 0),
    visitors: serie.reduce((n, p) => n + p.visitors, 0),
    previousViews: previous._sum.views ?? 0,
    topPages: pages.map((p) => ({ path: p.path, views: p._sum.views ?? 0 })),
    best,
  };
}
