import { db } from "@/lib/db";
import { clePaire, type EquipeRapprochable } from "@/lib/doublons-equipes-core";

/**
 * Les deux populations que le rapprochement confronte, et les paires déjà
 * écartées.
 *
 * Le découpage suit celui du reste du dépôt : la logique de rapprochement vit
 * dans `doublons-equipes-core.ts` et se teste sans base, ce module ne fait que
 * lire.
 */

/** Ce que la page a besoin de savoir de chaque fiche. */
const CHAMPS = {
  id: true,
  name: true,
  tag: true,
  logo: true,
  _count: {
    select: { managers: true, participations: true, matchesAsA: true, matchesAsB: true },
  },
  // Compté ici plutôt que dans `_count` : seules les adhésions actives comptent,
  // et un effectif passé ne dit rien de la fiche à conserver.
  memberships: { where: { leaveDate: null }, select: { id: true } },
} as const;

type LigneBrute = {
  id: string;
  name: string;
  tag: string;
  logo: string | null;
  _count: { managers: number; participations: number; matchesAsA: number; matchesAsB: number };
  memberships: { id: string }[];
};

/** Fiche telle que l'affiche la page : le noyau plus le logo. */
export type EquipeAffichable = EquipeRapprochable & { logo: string | null };

function versEquipe(t: LigneBrute): EquipeAffichable {
  return {
    id: t.id,
    name: t.name,
    tag: t.tag,
    logo: t.logo,
    // Les deux relations de match sont distinctes au schéma ; une équipe joue
    // d'un côté ou de l'autre, jamais des deux dans le même match.
    matchs: t._count.matchesAsA + t._count.matchesAsB,
    membres: t.memberships.length,
    managers: t._count.managers,
    inscriptions: t._count.participations,
  };
}

export type PopulationsRapprochables = {
  miroir: EquipeAffichable[];
  manuelles: EquipeAffichable[];
  /** Clés rendues par `clePaire`, à passer à `chercherDoublons`. */
  ecartees: string[];
};

/**
 * Les équipes créées par le miroir Premier, celles saisies à la main et jamais
 * rattachées, et les paires écartées à la main.
 *
 * Les fiches saisies à la main **puis** rattachées à Riot sont exclues des deux
 * populations : leur rapprochement a déjà eu lieu, ce sont l'état d'arrivée et
 * non un problème à traiter.
 */
export async function getPopulationsRapprochables(): Promise<PopulationsRapprochables> {
  const [miroir, manuelles, ecarts] = await Promise.all([
    db.team.findMany({ where: { premierManaged: true }, select: CHAMPS, orderBy: { name: "asc" } }),
    db.team.findMany({
      where: { premierManaged: false, premierTeamId: null },
      select: CHAMPS,
      orderBy: { name: "asc" },
    }),
    db.teamDuplicateDismissal.findMany({ select: { miroirId: true, manuelleId: true } }),
  ]);

  return {
    miroir: miroir.map(versEquipe),
    manuelles: manuelles.map(versEquipe),
    ecartees: ecarts.map((e) => clePaire(e.miroirId, e.manuelleId)),
  };
}

/**
 * Écarte une paire du rapprochement.
 *
 * Idempotent : réécarter une paire déjà écartée ne doit pas échouer, la page
 * pouvant être soumise deux fois.
 */
export async function ecarterPaire(miroirId: string, manuelleId: string): Promise<void> {
  await db.teamDuplicateDismissal.upsert({
    where: { miroirId_manuelleId: { miroirId, manuelleId } },
    create: { miroirId, manuelleId },
    update: {},
  });
}

/** Remet une paire écartée dans le rapprochement. */
export async function retablirPaire(miroirId: string, manuelleId: string): Promise<void> {
  await db.teamDuplicateDismissal.deleteMany({ where: { miroirId, manuelleId } });
}

export type PaireEcartee = {
  miroir: { id: string; name: string; tag: string };
  manuelle: { id: string; name: string; tag: string };
};

/** Paires écartées, pour pouvoir revenir sur la décision. */
export async function listerPairesEcartees(): Promise<PaireEcartee[]> {
  const lignes = await db.teamDuplicateDismissal.findMany({
    select: {
      miroir: { select: { id: true, name: true, tag: true } },
      manuelle: { select: { id: true, name: true, tag: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return lignes;
}
