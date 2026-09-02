import Link from "next/link";
import Segmented from "@/components/segmented";
import ClearableSearch from "@/components/clearable-search";
import { VALORANT_ROLES, ROLE_LABELS, ROLE_ICONS } from "@/lib/roles";
import {
  PLAYER_SORTS,
  PLAYER_TEAM_FILTERS,
  directoryHref,
  hasActiveDirectoryFilter,
  type PlayerDirectoryFilters,
} from "@/lib/players-directory";

/**
 * Filtres et tri de l'annuaire des joueurs.
 *
 * Même découpage que la page LFT : les rôles sont des liens (un clic suffit),
 * le reste passe par un formulaire GET pour ne déclencher qu'une navigation.
 * Chaque contrôle réémet les autres filtres actifs, ils se combinent donc sans
 * s'écraser.
 */
export default function PlayerDirectoryFilters({
  filters,
  total,
}: {
  filters: PlayerDirectoryFilters;
  total: number;
}) {
  const { role, team, q, sort } = filters;

  return (
    <div className="grid gap-3">
      <Segmented
        nav="Trier et filtrer l'annuaire"
        activeKey={role ?? "all"}
        className="justify-self-start"
      >
        <Link
          href={directoryHref({ ...filters, role: undefined })}
          className="t-tab"
          aria-current={!role ? "page" : undefined}
        >
          Tous les rôles
        </Link>
        {VALORANT_ROLES.map((r) => (
          <Link
            key={r}
            href={directoryHref({ ...filters, role: r })}
            className="t-tab"
            aria-current={role === r ? "page" : undefined}
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

      <form action="/joueurs" className="flex flex-wrap items-center gap-2">
        {/* Le rôle n'a pas de contrôle dans ce formulaire : on le réémet. */}
        {role && <input type="hidden" name="role" value={role} />}

        <ClearableSearch
          name="q"
          defaultValue={q ?? ""}
          placeholder="Rechercher un pseudo"
          ariaLabel="Rechercher un pseudo"
          className="min-w-0 flex-1 sm:max-w-56"
        />

        <label className="sr-only" htmlFor="dir-team">
          Statut d&apos;équipe
        </label>
        <select id="dir-team" name="team" defaultValue={team ?? ""} className="field">
          <option value="">Tous</option>
          {PLAYER_TEAM_FILTERS.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="dir-sort">
          Trier par
        </label>
        <select id="dir-sort" name="sort" defaultValue={sort} className="field">
          {PLAYER_SORTS.map((s) => (
            <option key={s.key} value={s.key}>
              Trier par {s.label.toLowerCase()}
            </option>
          ))}
        </select>

        <button className="rounded border border-[var(--border)] px-3 py-1.5 text-sm text-white transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]">
          Filtrer
        </button>

        {hasActiveDirectoryFilter(filters) && (
          <Link href="/joueurs" className="text-xs text-[var(--text-muted)] hover:text-white">
            Réinitialiser
          </Link>
        )}

        <span className="stat ml-auto text-xs text-[var(--text-muted)]">
          {total} joueur{total > 1 ? "s" : ""}
        </span>
      </form>
    </div>
  );
}
