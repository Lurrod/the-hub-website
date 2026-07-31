import Link from "next/link";
import { VALORANT_ROLES, ROLE_LABELS, ROLE_ICONS } from "@/lib/roles";
import { AGE_BRACKETS, TEAM_STATUSES, lftHref, hasActiveLftFilter, type LftFilters } from "@/lib/lft";


/**
 * Filtres de la page LFT.
 *
 * Les rôles sont des liens (un clic = un filtre appliqué, sans validation) ;
 * les champs à saisie ou à longue liste — recherche, pays, âge, statut
 * d'équipe — sont regroupés dans un formulaire GET pour n'envoyer qu'une
 * navigation. Chaque contrôle réémet les autres filtres actifs, donc ils se
 * combinent sans s'écraser.
 */
export default function LftFilters({
  filters,
  countries,
  total,
}: {
  filters: LftFilters;
  countries: readonly string[];
  total: number;
}) {
  const { role, country, age, team, q } = filters;

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={lftHref({ ...filters, role: undefined })}
          className="chip"
          data-active={!role}
        >
          Tous les rôles
        </Link>
        {VALORANT_ROLES.map((r) => (
          <Link
            key={r}
            href={lftHref({ ...filters, role: r })}
            className="chip"
            data-active={role === r}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ROLE_ICONS[r]}
              alt=""
              className={`h-4 w-4 shrink-0 ${role === r ? "opacity-100" : "opacity-60"}`}
            />
            {ROLE_LABELS[r]}
          </Link>
        ))}
      </div>

      <form action="/lft" className="flex flex-wrap items-center gap-2">
        {/* Le rôle n'a pas de contrôle dans ce formulaire : on le réémet. */}
        {role && <input type="hidden" name="role" value={role} />}

        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          maxLength={40}
          placeholder="Rechercher un pseudo"
          aria-label="Rechercher un pseudo"
          className="field min-w-0 flex-1 sm:max-w-56"
        />

        <label className="sr-only" htmlFor="lft-country">
          Pays
        </label>
        <select id="lft-country" name="country" defaultValue={country ?? ""} className="field">
          <option value="">Tous les pays</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="lft-age">
          Âge
        </label>
        <select id="lft-age" name="age" defaultValue={age ?? ""} className="field">
          <option value="">Tous les âges</option>
          {AGE_BRACKETS.map((b) => (
            <option key={b.key} value={b.key}>
              {b.label}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="lft-team">
          Statut d&apos;équipe
        </label>
        <select id="lft-team" name="team" defaultValue={team ?? ""} className="field">
          <option value="">Avec ou sans équipe</option>
          {TEAM_STATUSES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>

        {/* Action et non état : bordure accent pour ne pas se confondre avec
            une pilule de filtre inactive. */}
        <button className="chip border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white">
          Filtrer
        </button>

        {hasActiveLftFilter(filters) && (
          <Link href="/lft" className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)]">
            Réinitialiser
          </Link>
        )}

        <span className="ml-auto shrink-0 text-xs text-[var(--text-muted)]">
          {total} joueur{total > 1 ? "s" : ""}
        </span>
      </form>
    </div>
  );
}
