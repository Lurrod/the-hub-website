import { db } from "@/lib/db";
import { buildStandingRows, type StandingDisplayRow } from "@/lib/standings";
import type { MiniMatch } from "@/components/match-mini-list";

/**
 * Un palier, prêt à afficher : le tournoi, son classement tronqué et ses
 * dernières rencontres.
 *
 * Classement et résultats voyagent ensemble parce qu'ils s'affichent ensemble,
 * dans la même colonne. Les séparer obligerait la page à recoudre deux listes
 * par palier, et à savoir dans quel ordre — une responsabilité qui n'est pas la
 * sienne.
 */
export type PremierPanel = {
  tournamentId: string;
  tournamentName: string;
  rows: StandingDisplayRow[];
  results: MiniMatch[];
};

/**
 * Ordre d'affichage des paliers, l'Invite d'abord.
 *
 * Il est écrit ici plutôt que déduit de la base : les deux tournois d'une
 * saison partagent la même date de début, et l'ordre rendu par la requête
 * varierait donc d'un appel à l'autre.
 */
const ORDRE_PALIERS = ["INVITE", "CONTENDER"];

/**
 * Les deux classements du Premier, tronqués à leurs premières lignes.
 *
 * Le tournoi retenu est le plus récent **de chaque palier**, et non les deux
 * plus récents tous paliers confondus : un palier dont le tournoi n'aurait pas
 * encore été créé ferait rendre deux fois l'autre.
 *
 * Le classement est calculé par `buildStandingRows`, celle qu'utilisent déjà
 * les pages de tournoi. C'est délibéré : deux calculs de classement dans le
 * dépôt finiraient par ne plus dire la même chose de la même saison.
 */
export async function getPremierOverview(
  topN = 8,
  resultatsParPalier = 5
): Promise<PremierPanel[]> {
  const tournois = await db.tournament.findMany({
    where: { premierTier: { not: null } },
    orderBy: { startDate: "desc" },
    select: {
      id: true,
      name: true,
      premierTier: true,
      participants: {
        select: { teamId: true, team: { select: { name: true, tag: true } } },
      },
      matches: {
        where: { status: "FINISHED" },
        select: { teamAId: true, teamBId: true, scoreA: true, scoreB: true },
      },
    },
  });

  // La liste est triée par date décroissante : le premier tournoi rencontré
  // pour un palier est le plus récent de ce palier.
  const parPalier = new Map<string, (typeof tournois)[number]>();
  for (const t of tournois) {
    if (t.premierTier && !parPalier.has(t.premierTier)) parPalier.set(t.premierTier, t);
  }

  const retenus = ORDRE_PALIERS.map((palier) => parPalier.get(palier)).filter(
    (t): t is (typeof tournois)[number] => t !== undefined
  );

  return Promise.all(
    retenus.map(async (t) => ({
      tournamentId: t.id,
      tournamentName: t.name,
      rows: buildStandingRows(
        t.participants.map((p) => ({
          teamId: p.teamId,
          name: p.team.name,
          tag: p.team.tag,
        })),
        t.matches
      ).slice(0, topN),
      results: await derniersResultats(t.id, resultatsParPalier),
    }))
  );
}

/**
 * Les dernières rencontres terminées d'un tournoi.
 *
 * Bornée à un tournoi et non aux deux paliers réunis : les résultats
 * s'affichent sous le classement de leur palier, et une liste commune y serait
 * refiltrée côté page — avec le risque qu'un palier très actif prenne toutes
 * les places de l'autre.
 *
 * Rend directement des `MiniMatch` plutôt que des lignes Prisma : l'adaptateur
 * qui fait cette conversion est déjà recopié dans la fiche équipe et la fiche
 * joueur, une troisième copie dans la page serait la copie de trop.
 */
async function derniersResultats(tournamentId: string, limit: number): Promise<MiniMatch[]> {
  const matchs = await db.match.findMany({
    where: { status: "FINISHED", tournamentId },
    orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
    take: limit,
    select: {
      id: true,
      date: true,
      hasTime: true,
      scoreA: true,
      scoreB: true,
      forfeit: true,
      status: true,
      bestOf: true,
      teamA: { select: { tag: true, logo: true } },
      teamB: { select: { tag: true, logo: true } },
      maps: { select: { scoreA: true, scoreB: true }, orderBy: { order: "asc" } },
    },
  });

  return matchs.map((m) => ({
    id: m.id,
    date: m.date,
    hasTime: m.hasTime,
    teamA: { tag: m.teamA.tag, logo: m.teamA.logo },
    teamB: { tag: m.teamB.tag, logo: m.teamB.logo },
    scoreA: m.scoreA,
    scoreB: m.scoreB,
    forfeit: m.forfeit,
    status: m.status,
    bestOf: m.bestOf,
    maps: m.maps,
  }));
}
