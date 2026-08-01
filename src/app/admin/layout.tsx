import { NOINDEX } from "@/lib/metadata";

/**
 * Ce layout n'existe que pour porter les métadonnées du segment : il n'ajoute
 * aucun encadrement visuel. Les sept pages d'administration héritent du
 * `robots: noindex` parce qu'aucune ne définit sa propre clé `robots`.
 *
 * La garde d'accès reste dans chaque page (`isAdmin` + redirection) : la
 * déplacer ici changerait le comportement, ce layout ne fait que documenter.
 */
export const metadata = NOINDEX;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
