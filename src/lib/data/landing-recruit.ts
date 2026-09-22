import { db } from "@/lib/db";
import { buildRecruitAds, type RecruitAd } from "@/lib/landing-recruit-core";

/** Annonces montrées par le panneau : assez pour remplir, pas pour défiler. */
const SHOWN = 3;

export type LandingRecruit = {
  ads: RecruitAd[];
  lftCount: number;
  lfpCount: number;
};

/**
 * Les annonces fraîches du panneau « Recrutement » de la landing, avec les
 * totaux de chaque côté pour l'en-tête.
 *
 * On lit `SHOWN` lignes de chaque côté et pas plus : `buildRecruitAds` fait
 * la fusion, et il ne peut jamais retenir plus de `SHOWN` annonces d'une même
 * sorte.
 */
export async function getLandingRecruit(): Promise<LandingRecruit> {
  const [players, teams, lftCount, lfpCount] = await Promise.all([
    db.player.findMany({
      where: { lft: true },
      orderBy: [{ lftSince: { sort: "desc", nulls: "last" } }, { pseudo: "asc" }],
      take: SHOWN,
      select: {
        id: true,
        pseudo: true,
        photo: true,
        valorantRole: true,
        accountType: true,
        lftSince: true,
      },
    }),
    db.team.findMany({
      where: { lfp: true },
      orderBy: [{ lfpSince: { sort: "desc", nulls: "last" } }, { name: "asc" }],
      take: SHOWN,
      select: {
        id: true,
        name: true,
        tag: true,
        logo: true,
        lfpRoles: true,
        lfpSince: true,
        _count: { select: { memberships: { where: { leaveDate: null } } } },
      },
    }),
    db.player.count({ where: { lft: true } }),
    db.team.count({ where: { lfp: true } }),
  ]);

  const ads = buildRecruitAds(
    players,
    teams.map(({ _count, ...t }) => ({ ...t, rosterCount: _count.memberships })),
    SHOWN,
    new Date()
  );
  return { ads, lftCount, lfpCount };
}
