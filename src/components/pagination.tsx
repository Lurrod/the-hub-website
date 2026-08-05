import Link from "next/link";
import { pageCount, pageHref, pageRange } from "@/lib/pagination";

/**
 * Navigation entre les pages d'une liste. Rien ne s'affiche s'il n'y a qu'une
 * page : la pagination ne doit pas encombrer les listes courtes.
 *
 * `params` porte les autres paramètres d'URL (filtres, recherche) pour qu'ils
 * survivent au changement de page.
 */
export default function Pagination({
  basePath,
  params,
  page,
  pageSize,
  total,
  label,
}: {
  basePath: string;
  params: Record<string, string | undefined>;
  page: number;
  pageSize: number;
  total: number;
  /** Nom de ce qui est compté, au pluriel (« tournois », « joueurs »). */
  label: string;
}) {
  const pages = pageCount(total, pageSize);
  const range = pageRange(page, pageSize, total);
  if (pages <= 1) return null;

  const link =
    "rounded border border-[var(--border)] px-3 py-1.5 text-sm text-white transition-colors duration-[130ms] hover:border-[var(--accent)] hover:text-[var(--accent)]";
  const disabled =
    "rounded border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-subtle)]";

  return (
    <nav className="mt-6 flex flex-wrap items-center justify-between gap-3" aria-label="Pagination">
      <p className="stat text-xs text-[var(--text-muted)]">
        {range ? `${range.from}-${range.to}` : 0} sur {total} {label}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={pageHref(basePath, params, page - 1)} className={link} rel="prev">
            Précédent
          </Link>
        ) : (
          <span className={disabled} aria-disabled="true">
            Précédent
          </span>
        )}
        <span className="stat px-1 text-xs text-[var(--text-muted)]">
          {Math.min(page, pages)} / {pages}
        </span>
        {page < pages ? (
          <Link href={pageHref(basePath, params, page + 1)} className={link} rel="next">
            Suivant
          </Link>
        ) : (
          <span className={disabled} aria-disabled="true">
            Suivant
          </span>
        )}
      </div>
    </nav>
  );
}
