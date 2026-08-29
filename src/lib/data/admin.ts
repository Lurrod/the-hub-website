import { db } from "@/lib/db";
import type { CleAlerte } from "@/lib/admin-core";
import { chercherDoublons } from "@/lib/doublons-equipes-core";
import { getPopulationsRapprochables } from "@/lib/data/doublons-equipes";

/**
 * Comptes des indicateurs du tableau de bord.
 *
 * Un aller-retour par indicateur, tous lancés ensemble : ce sont des `count`,
 * ils ne rapatrient aucune ligne.
 */
export async function getAlerteCounts(now = new Date()): Promise<Record<CleAlerte, number>> {
  const [matchsASaisir, sansVainqueur, sansInscrit, miroirSansLogo, miroirIncoherent, doublons] =
    await Promise.all([
      db.match.count({ where: { status: { not: "FINISHED" }, date: { lt: now } } }),
      db.match.count({ where: { status: "FINISHED", winnerId: null, forfeit: "NONE" } }),
      db.tournament.count({ where: { startDate: { lt: now }, participants: { none: {} } } }),
      // Restreint au miroir : Riot fournit toujours un logo, donc son absence
      // est un téléchargement qui a échoué. Sur une fiche saisie à la main,
      // l'absence est normale — et le compteur passerait à 20, sans rien dire.
      db.team.count({ where: { premierManaged: true, logo: null } }),
      db.team.count({ where: { premierManaged: true, premierTeamId: null } }),
      // Seul indicateur qui ne se compte pas en SQL : le rapprochement vit dans
      // le noyau, pour rester testable sans base. Trois requêtes plutôt qu'un
      // `count`, sur une centaine de fiches — le tableau de bord s'en remet.
      compterDoublons(),
    ]);

  return {
    matchsASaisir,
    sansVainqueur,
    sansInscrit,
    miroirSansLogo,
    miroirIncoherent,
    doublonsEquipes: doublons,
  };
}

/** Nombre de rapprochements d'équipes encore à trancher. */
async function compterDoublons(): Promise<number> {
  const { miroir, manuelles, ecartees } = await getPopulationsRapprochables();
  return chercherDoublons(miroir, manuelles, ecartees).length;
}

export type AdminActivity = {
  matchs: { id: string; nom: string }[];
  equipes: { id: string; nom: string }[];
  inscriptions: { id: string; pseudo: string }[];
  /** Dernier passage de la synchro Premier, déduit sans nouveau champ. */
  derniereSynchro: Date | null;
};

/**
 * Ce qui s'est passé récemment.
 *
 * La date du dernier passage de la synchro se lit sur le plus récent
 * `updatedAt` des équipes du miroir : chaque passage les touche, et cela évite
 * d'ajouter un champ au schéma pour une information d'affichage.
 */
export async function getAdminActivity(limite = 5): Promise<AdminActivity> {
  const [matchs, equipes, inscriptions, synchro] = await Promise.all([
    db.match.findMany({
      orderBy: { createdAt: "desc" },
      take: limite,
      select: {
        id: true,
        teamA: { select: { tag: true } },
        teamB: { select: { tag: true } },
      },
    }),
    db.team.findMany({
      orderBy: { createdAt: "desc" },
      take: limite,
      select: { id: true, name: true },
    }),
    // Une inscription est une fiche rattachée à un compte : les fiches créées
    // par import n'en sont pas, et elles sont l'écrasante majorité.
    db.player.findMany({
      where: { userId: { not: null } },
      orderBy: { createdAt: "desc" },
      take: limite,
      select: { id: true, pseudo: true },
    }),
    db.team.findFirst({
      where: { premierManaged: true },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
  ]);

  return {
    matchs: matchs.map((m) => ({ id: m.id, nom: `${m.teamA.tag} — ${m.teamB.tag}` })),
    equipes: equipes.map((t) => ({ id: t.id, nom: t.name })),
    inscriptions: inscriptions.map((p) => ({ id: p.id, pseudo: p.pseudo })),
    derniereSynchro: synchro?.updatedAt ?? null,
  };
}

/** Les quatre volumes affichés en bas du tableau de bord. */
export async function getAdminCounts() {
  const [tournois, equipes, joueurs, matchs] = await Promise.all([
    db.tournament.count(),
    db.team.count(),
    db.player.count(),
    db.match.count(),
  ]);
  return { tournois, equipes, joueurs, matchs };
}

export type FiltresEquipes = { q?: string; origine?: string; anomalie?: string };

/**
 * Équipes de la liste d'administration.
 *
 * Séparée de `listTeams` du module public : les filtres d'anomalie sont des
 * notions d'administration, et les y ajouter chargerait une fonction utilisée
 * par tout le site pour un usage réservé à une personne.
 *
 * Une valeur de filtre inconnue est ignorée plutôt que refusée — une URL
 * bricolée ne doit pas casser une page.
 */
export function listAdminTeams(f: FiltresEquipes = {}) {
  return db.team.findMany({
    where: {
      ...(f.q
        ? {
            OR: [
              { name: { contains: f.q, mode: "insensitive" as const } },
              { tag: { contains: f.q, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(f.origine === "miroir" ? { premierManaged: true } : {}),
      ...(f.origine === "saisie" ? { premierManaged: false } : {}),
      ...(f.anomalie === "sans-logo" ? { premierManaged: true, logo: null } : {}),
      ...(f.anomalie === "miroir-incoherent" ? { premierManaged: true, premierTeamId: null } : {}),
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, tag: true, premierManaged: true },
  });
}

export type FiltresJoueurs = { q?: string; compte?: string };

export function listAdminPlayers(f: FiltresJoueurs = {}) {
  return db.player.findMany({
    where: {
      ...(f.q ? { pseudo: { contains: f.q, mode: "insensitive" as const } } : {}),
      ...(f.compte === "oui" ? { userId: { not: null } } : {}),
      ...(f.compte === "non" ? { userId: null } : {}),
    },
    orderBy: { pseudo: "asc" },
    select: { id: true, pseudo: true, userId: true },
  });
}

export type FiltresTournois = { q?: string; statut?: string; anomalie?: string };

export function listAdminTournaments(f: FiltresTournois = {}, now = new Date()) {
  return db.tournament.findMany({
    where: {
      ...(f.q ? { name: { contains: f.q, mode: "insensitive" as const } } : {}),
      ...(f.statut ? { status: f.statut as never } : {}),
      ...(f.anomalie === "matchs-a-saisir"
        ? { matches: { some: { status: { not: "FINISHED" }, date: { lt: now } } } }
        : {}),
      ...(f.anomalie === "sans-vainqueur"
        ? { matches: { some: { status: "FINISHED", winnerId: null, forfeit: "NONE" } } }
        : {}),
      ...(f.anomalie === "sans-inscrit"
        ? { startDate: { lt: now }, participants: { none: {} } }
        : {}),
    },
    orderBy: [{ startDate: "desc" }, { name: "asc" }],
    select: { id: true, name: true, status: true },
  });
}
