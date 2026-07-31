import Link from "next/link";
import { VALORANT_ROLES, ROLE_LABELS } from "@/lib/roles";

/** Conserve les autres filtres actifs quand on en change un seul. */
function href(params: { role?: string; country?: string }): string {
  const q = new URLSearchParams();
  if (params.role) q.set("role", params.role);
  if (params.country) q.set("country", params.country);
  const s = q.toString();
  return s ? `/lft?${s}` : "/lft";
}

/**
 * Filtres de la page LFT : chips pour les 4 rôles Valorant, liste déroulante
 * pour le pays (le nombre de pays n'est pas borné, des chips ne tiendraient pas).
 */
export default function LftFilters({
  role,
  country,
  countries,
}: {
  role?: string;
  country?: string;
  countries: readonly string[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex flex-wrap gap-2">
        <Link
          href={href({ country })}
          className="chip rounded-lg data-[active=true]:text-white"
          data-active={!role}
        >
          Tous les rôles
        </Link>
        {VALORANT_ROLES.map((r) => (
          <Link
            key={r}
            href={href({ role: r, country })}
            className="chip rounded-lg data-[active=true]:text-white"
            data-active={role === r}
          >
            {ROLE_LABELS[r]}
          </Link>
        ))}
      </div>

      {countries.length > 0 && (
        <form action="/lft" className="ml-auto flex items-center gap-2">
          {role && <input type="hidden" name="role" value={role} />}
          <label className="sr-only" htmlFor="lft-country">
            Pays
          </label>
          <select
            id="lft-country"
            name="country"
            defaultValue={country ?? ""}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm text-white outline-none transition-colors focus:border-[var(--accent)]"
          >
            <option value="">Tous les pays</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-white transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]">
            Filtrer
          </button>
        </form>
      )}
    </div>
  );
}
