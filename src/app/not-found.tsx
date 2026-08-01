import Link from "next/link";
import StatusPage, { STATUS_ACTION } from "@/components/status-page";
import { NOINDEX } from "@/lib/metadata";

export const metadata = { title: "Page introuvable", ...NOINDEX };

/**
 * Atteinte aussi bien par une URL inexistante que par les `notFound()` des
 * fiches (équipe, joueur, match, tournoi supprimés ou identifiant erroné).
 */
export default function NotFound() {
  return (
    <StatusPage
      code="404"
      title="Cette page n'existe pas"
      action={
        <Link href="/recherche" className={STATUS_ACTION}>
          Rechercher
        </Link>
      }
    >
      <p>
        Le lien est peut-être erroné, ou la fiche a été supprimée. Les tournois,
        équipes et joueurs restent accessibles depuis la recherche.
      </p>
    </StatusPage>
  );
}
