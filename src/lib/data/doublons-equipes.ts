import { Prisma } from "@prisma/client";
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

/**
 * Ce qu'une fusion a déplacé, ou déplacerait.
 *
 * Les rejets sont comptés séparément des déplacements : une inscription qui
 * disparaît parce que la fiche conservée était déjà inscrite au même tournoi
 * n'est pas une perte, mais elle doit se voir dans le rapport. La confondre
 * avec un déplacement ferait mentir le total.
 */
export type RapportFusion = {
  miroir: string;
  manuelle: string;
  matchs: number;
  inscriptionsDeplacees: number;
  inscriptionsFusionnees: number;
  managersDeplaces: number;
  managersFusionnes: number;
  membresDeplaces: number;
  membresFusionnes: number;
};

/** Refus motivé : la fusion n'a pas eu lieu et rien n'a été touché. */
export class FusionRefusee extends Error {
  constructor(readonly raison: string) {
    super(raison);
    this.name = "FusionRefusee";
  }
}

/**
 * Fusionne une fiche du miroir Premier dans la fiche saisie à la main.
 *
 * Le sens est celui des six équipes déjà correctes en production : c'est la
 * fiche saisie qui survit, parce qu'elle porte l'effectif, les managers et les
 * inscriptions ; elle reçoit l'identifiant Riot et l'historique Premier de la
 * coquille, qui est ensuite supprimée.
 *
 * **L'ordre n'est pas négociable.** `Match.teamA` et `Match.teamB` sont en
 * `onDelete: Cascade` : supprimer la coquille avant d'avoir déplacé ses matchs
 * les effacerait définitivement. De même `premierTeamId` est unique — il faut le
 * libérer sur la coquille avant de le poser sur la fiche conservée, sinon la
 * contrainte saute au milieu de la transaction.
 *
 * Trois collisions d'unicité sont possibles et toutes existent en vrai : une
 * inscription au même tournoi des deux côtés, un même utilisateur manager des
 * deux fiches, un joueur avec une adhésion active des deux côtés. Dans les trois
 * cas la ligne de la coquille est supprimée plutôt que déplacée — la fiche
 * conservée fait déjà foi.
 *
 * Le tout en Serializable : la synchronisation Premier tourne en cron et peut
 * toucher la coquille pendant la fusion.
 */
export function fusionnerPaire(miroirId: string, manuelleId: string): Promise<RapportFusion> {
  return db.$transaction(
    async (tx) => {
      if (miroirId === manuelleId) {
        throw new FusionRefusee("Une fiche ne se fusionne pas avec elle-même.");
      }

      const [miroir, manuelle] = await Promise.all([
        tx.team.findUnique({
          where: { id: miroirId },
          select: {
            id: true,
            name: true,
            logo: true,
            premierTeamId: true,
            premierRecord: true,
            premierManaged: true,
          },
        }),
        tx.team.findUnique({
          where: { id: manuelleId },
          select: { id: true, name: true, logo: true, premierTeamId: true, premierManaged: true },
        }),
      ]);

      if (!miroir || !manuelle) throw new FusionRefusee("Une des deux fiches n'existe plus.");
      if (!miroir.premierManaged) {
        throw new FusionRefusee(`« ${miroir.name} » ne vient pas du miroir Premier.`);
      }
      if (manuelle.premierManaged || manuelle.premierTeamId) {
        throw new FusionRefusee(`« ${manuelle.name} » est déjà rattachée à une équipe Premier.`);
      }

      // Un match opposant les deux fiches deviendrait un match contre soi-même :
      // la fusion est refusée plutôt que de produire cette donnée.
      const face = await tx.match.count({
        where: {
          OR: [
            { teamAId: miroirId, teamBId: manuelleId },
            { teamAId: manuelleId, teamBId: miroirId },
          ],
        },
      });
      if (face > 0) {
        throw new FusionRefusee(
          `« ${miroir.name} » et « ${manuelle.name} » se sont affrontées : les fusionner créerait un match contre soi-même.`
        );
      }

      const asA = await tx.match.updateMany({
        where: { teamAId: miroirId },
        data: { teamAId: manuelleId },
      });
      const asB = await tx.match.updateMany({
        where: { teamBId: miroirId },
        data: { teamBId: manuelleId },
      });
      await tx.match.updateMany({ where: { winnerId: miroirId }, data: { winnerId: manuelleId } });

      // Inscriptions : unique sur (tournamentId, teamId).
      const dejaInscrite = new Set(
        (
          await tx.tournamentParticipant.findMany({
            where: { teamId: manuelleId },
            select: { tournamentId: true },
          })
        ).map((p) => p.tournamentId)
      );
      const inscriptions = await tx.tournamentParticipant.findMany({
        where: { teamId: miroirId },
        select: { id: true, tournamentId: true },
      });
      const inscriptionsEnDouble = inscriptions.filter((i) => dejaInscrite.has(i.tournamentId));
      await tx.tournamentParticipant.deleteMany({
        where: { id: { in: inscriptionsEnDouble.map((i) => i.id) } },
      });
      const inscriptionsDeplacees = await tx.tournamentParticipant.updateMany({
        where: { teamId: miroirId },
        data: { teamId: manuelleId },
      });

      // Managers : unique sur (teamId, userId).
      const dejaManager = new Set(
        (
          await tx.teamManager.findMany({ where: { teamId: manuelleId }, select: { userId: true } })
        ).map((m) => m.userId)
      );
      const managers = await tx.teamManager.findMany({
        where: { teamId: miroirId },
        select: { id: true, userId: true },
      });
      const managersEnDouble = managers.filter((m) => dejaManager.has(m.userId));
      await tx.teamManager.deleteMany({ where: { id: { in: managersEnDouble.map((m) => m.id) } } });
      const managersDeplaces = await tx.teamManager.updateMany({
        where: { teamId: miroirId },
        data: { teamId: manuelleId },
      });

      // Adhésions : l'index unique partiel porte sur le joueur seul, pas sur le
      // couple — un joueur n'a qu'une adhésion active, toutes équipes
      // confondues. Déplacer celle de la coquille alors qu'il en a déjà une
      // active ailleurs en produirait une seconde.
      const dejaEngage = new Set(
        (
          await tx.teamMembership.findMany({
            where: { leaveDate: null, teamId: { not: miroirId } },
            select: { playerId: true },
          })
        ).map((m) => m.playerId)
      );
      const adhesions = await tx.teamMembership.findMany({
        where: { teamId: miroirId, leaveDate: null },
        select: { id: true, playerId: true },
      });
      const adhesionsEnDouble = adhesions.filter((a) => dejaEngage.has(a.playerId));
      await tx.teamMembership.deleteMany({
        where: { id: { in: adhesionsEnDouble.map((a) => a.id) } },
      });
      const membresDeplaces = await tx.teamMembership.updateMany({
        where: { teamId: miroirId },
        data: { teamId: manuelleId },
      });

      // Libérer l'identifiant Riot avant de le poser : il est unique.
      await tx.team.update({
        where: { id: miroirId },
        data: { premierTeamId: null, premierRecord: null },
      });
      await tx.team.update({
        where: { id: manuelleId },
        data: {
          premierTeamId: miroir.premierTeamId,
          premierRecord: miroir.premierRecord,
          // `premierManaged` reste faux : le nom a été choisi ici et la
          // synchronisation ne doit pas l'écraser. C'est exactement ce qui
          // distingue une fiche rattachée d'une fiche du miroir.
          premierManaged: false,
          // Le logo de Riot ne remplace pas celui qu'on a choisi, il ne comble
          // que son absence.
          logo: manuelle.logo ?? miroir.logo,
        },
      });
      await tx.team.delete({ where: { id: miroirId } });

      return {
        miroir: miroir.name,
        manuelle: manuelle.name,
        matchs: asA.count + asB.count,
        inscriptionsDeplacees: inscriptionsDeplacees.count,
        inscriptionsFusionnees: inscriptionsEnDouble.length,
        managersDeplaces: managersDeplaces.count,
        managersFusionnes: managersEnDouble.length,
        membresDeplaces: membresDeplaces.count,
        membresFusionnes: adhesionsEnDouble.length,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}
