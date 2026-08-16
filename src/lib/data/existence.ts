import { db } from "@/lib/db";

/** Sections publiques dont les fiches sont vérifiées par le proxy. */
export type FicheSection = "tournois" | "equipes" | "joueurs" | "matchs";

/**
 * Existence d'une fiche, par lecture de la seule clé primaire.
 *
 * Appelé par le proxy avant le rendu : une fois que `loading.tsx` a fait
 * partir la coquille en streaming, le statut HTTP ne peut plus passer à 404 et
 * une fiche inexistante répondait 200 (soft-404 en Search Console). La doc
 * Next recommande précisément ce contrôle rapide côté proxy.
 */
export async function ficheExists(section: FicheSection, id: string): Promise<boolean> {
  switch (section) {
    case "tournois":
      return !!(await db.tournament.findUnique({ where: { id }, select: { id: true } }));
    case "equipes":
      return !!(await db.team.findUnique({ where: { id }, select: { id: true } }));
    case "joueurs":
      return !!(await db.player.findUnique({ where: { id }, select: { id: true } }));
    case "matchs":
      return !!(await db.match.findUnique({ where: { id }, select: { id: true } }));
  }
}
