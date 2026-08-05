import Link from "next/link";
import { ROLE_ICONS, ROLE_LABELS, type ValorantRoleKey } from "@/lib/roles";
import { lfpRolesLabel } from "@/lib/lfp";

export type LfpTeamCardData = {
  id: string;
  name: string;
  tag: string;
  logo: string | null;
  region: string;
  lfpRoles: string[];
  lfpMessage: string | null;
  rosterCount: number;
};

/** Carte d'une équipe en recherche de joueur. Pendant de `LftCard`. */
export default function LfpCard({ team }: { team: LfpTeamCardData }) {
  const roles = team.lfpRoles.filter((r): r is ValorantRoleKey => r in ROLE_LABELS);

  return (
    <Link
      href={`/equipes/${team.id}`}
      className="card card-interactive flex flex-col gap-3 bg-[#242832] p-4"
    >
      <div className="flex items-center gap-3">
        {team.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            loading="lazy"
            decoding="async"
            src={team.logo}
            alt=""
            className="h-12 w-12 shrink-0 rounded object-cover"
          />
        ) : (
          <div className="monogram grid h-12 w-12 shrink-0 place-items-center rounded text-xs">
            {team.tag.slice(0, 3).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <div className="truncate font-medium text-white">{team.name}</div>
          <div className="stat text-xs text-[var(--text-muted)]">
            {team.tag}
            <span className="dot-sep">·</span>
            {team.rosterCount} joueur{team.rosterCount > 1 ? "s" : ""}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {roles.length === 0 ? (
          <span className="rounded bg-[var(--surface)] px-1.5 py-0.5 text-[11px] text-[var(--text-muted)]">
            {lfpRolesLabel([], ROLE_LABELS)}
          </span>
        ) : (
          roles.map((r) => (
            <span
              key={r}
              className="flex items-center gap-1 rounded bg-[var(--surface)] px-1.5 py-0.5 text-[11px] text-[var(--text-muted)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                loading="lazy"
                decoding="async"
                src={ROLE_ICONS[r]}
                alt=""
                className="h-3 w-3 shrink-0 opacity-70"
              />
              {ROLE_LABELS[r]}
            </span>
          ))
        )}
      </div>

      {team.lfpMessage && (
        <p className="line-clamp-2 text-xs leading-relaxed text-[var(--text-muted)]">
          {team.lfpMessage}
        </p>
      )}
    </Link>
  );
}
