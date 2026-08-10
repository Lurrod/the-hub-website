import Link from "next/link";
import Segmented from "@/components/segmented";
import ClearableSearch from "@/components/clearable-search";
import { VALORANT_ROLES, ROLE_LABELS, ROLE_ICONS } from "@/lib/roles";
import { hasActiveLfpFilter, lfpHref, type LfpFilters } from "@/lib/lfp";

/**
 * Filtres de l'onglet Équipes.
 *
 * Le filtre par poste demande « qui recrute à ce poste » : il retient aussi
 * les équipes ouvertes à tous les rôles, d'où le libellé « recrute à ce
 * poste » plutôt qu'un simple nom de rôle.
 */
export default function LfpFilters({ filters, total }: { filters: LfpFilters; total: number }) {
  const { role, q } = filters;

  return (
    <div className="grid gap-3">
      <Segmented activeKey={role ?? "all"} className="justify-self-start">
        <Link
          href={lfpHref({ ...filters, role: undefined })}
          className="t-tab"
          role="tab"
          aria-selected={!role}
        >
          Tous les postes
        </Link>
        {VALORANT_ROLES.map((r) => (
          <Link
            key={r}
            href={lfpHref({ ...filters, role: r })}
            className="t-tab"
            role="tab"
            aria-selected={role === r}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              loading="lazy"
              decoding="async"
              src={ROLE_ICONS[r]}
              alt=""
              className={`h-4 w-4 shrink-0 ${role === r ? "opacity-100" : "opacity-60"}`}
            />
            {ROLE_LABELS[r]}
          </Link>
        ))}
      </Segmented>

      <form action="/lft" className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="vue" value="lfp" />
        {role && <input type="hidden" name="role" value={role} />}

        <ClearableSearch
          name="q"
          defaultValue={q ?? ""}
          placeholder="Nom ou tag d'équipe"
          ariaLabel="Rechercher une équipe"
          className="min-w-0 flex-1 sm:max-w-56"
        />

        <button className="rounded border border-[var(--border)] px-3 py-1.5 text-sm text-white transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]">
          Filtrer
        </button>

        {hasActiveLfpFilter(filters) && (
          <Link href="/lft?vue=lfp" className="text-xs text-[var(--text-muted)] hover:text-white">
            Réinitialiser
          </Link>
        )}

        <span className="stat ml-auto text-xs text-[var(--text-muted)]">
          {total} équipe{total > 1 ? "s" : ""}
        </span>
      </form>
    </div>
  );
}
