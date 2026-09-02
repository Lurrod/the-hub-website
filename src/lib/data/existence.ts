import { db } from "@/lib/db";
import { matchFicheName, type FicheSection } from "@/lib/slug";

export type { FicheSection };

/**
 * Nom canonique d'une fiche, ou `null` si elle n'existe pas.
 *
 * Appelé par le proxy avant le rendu, pour deux décisions à la fois.
 *
 * L'existence d'abord : une fois que `loading.tsx` a fait partir la coquille
 * en streaming, le statut HTTP ne peut plus passer à 404 et une fiche
 * inexistante répondait 200 — un soft-404 en Search Console. La documentation
 * de Next recommande précisément ce contrôle rapide côté proxy.
 *
 * Le nom ensuite, qui sert à construire l'URL canonique `<slug>-<id>` et à
 * décider d'une redirection permanente si la forme demandée n'est pas celle-là.
 * C'est la même requête : la lire coûte le même aller-retour qu'avant.
 *
 * Un match n'a pas de nom propre : il est nommé par ses deux équipes, comme
 * partout ailleurs sur le site.
 */
export async function ficheName(section: FicheSection, id: string): Promise<string | null> {
  switch (section) {
    case "tournois": {
      const t = await db.tournament.findUnique({ where: { id }, select: { name: true } });
      return t?.name ?? null;
    }
    case "equipes": {
      const t = await db.team.findUnique({ where: { id }, select: { name: true } });
      return t?.name ?? null;
    }
    case "joueurs": {
      const p = await db.player.findUnique({ where: { id }, select: { pseudo: true } });
      return p?.pseudo ?? null;
    }
    case "matchs": {
      const m = await db.match.findUnique({
        where: { id },
        select: { teamA: { select: { name: true } }, teamB: { select: { name: true } } },
      });
      return m ? matchFicheName(m.teamA.name, m.teamB.name) : null;
    }
  }
}
