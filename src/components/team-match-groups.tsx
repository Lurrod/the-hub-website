import MatchRow, { type MatchRowData } from "@/components/match-row";
import SummaryLink from "@/components/summary-link";

export type MatchGroup = {
  tournamentId: string;
  tournamentName: string;
  tournamentLogo: string | null;
  matches: MatchRowData[];
};

function Chevron() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="disclosure-chevron h-4 w-4 shrink-0 text-[var(--text-subtle)]"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/**
 * Matchs d'une équipe rangés par tournoi, chaque tournoi étant une zone
 * repliable. `<details>` natif : le repli fonctionne sans JavaScript.
 * Le tournoi le plus récent est ouvert par défaut, les autres sont fermés.
 */
export default function TeamMatchGroups({
  groups,
  teamId,
}: {
  groups: MatchGroup[];
  teamId: string;
}) {
  if (groups.length === 0) {
    return <p className="text-[var(--text-muted)]">Aucun match joué pour le moment.</p>;
  }

  return (
    <div className="grid gap-3">
      {groups.map((g, i) => {
        const wins = g.matches.filter((m) => m.winnerId === teamId).length;
        const losses = g.matches.length - wins;

        return (
          <details
            key={g.tournamentId}
            open={i === 0}
            className="disclosure overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]"
          >
            {/* --card-hover vaut #242832 : la ligne du tournoi se détache du
                corps de la zone, qui reste sur --surface. */}
            <summary className="flex items-center gap-3 bg-[var(--card-hover)] px-3 py-2.5 transition-all hover:brightness-110">
              {/* Seuls le logo et le nom mènent au tournoi. Le reste de la ligne,
                  espace vide compris, sert à replier la zone. */}
              <SummaryLink
                href={`/tournois/${g.tournamentId}`}
                className="group/link flex min-w-0 items-center gap-3"
              >
                {g.tournamentLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    loading="lazy" decoding="async" src={g.tournamentLogo}
                    alt=""
                    className="h-6 w-6 shrink-0 rounded object-cover"
                  />
                ) : (
                  <span className="monogram grid h-6 w-6 shrink-0 place-items-center rounded text-[9px]">
                    {g.tournamentName.slice(0, 2).toUpperCase()}
                  </span>
                )}
                <span className="truncate font-semibold text-white transition-colors group-hover/link:text-[var(--accent)]">
                  {g.tournamentName}
                </span>
              </SummaryLink>

              <span className="flex-1" aria-hidden="true" />

              <span className="stat shrink-0 text-xs">
                <span className="text-[var(--success)]">{wins}V</span>
                <span className="mx-1 text-[var(--text-subtle)]">-</span>
                <span className="text-[var(--destructive)]">{losses}D</span>
              </span>

              <span className="shrink-0 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                {g.matches.length} match{g.matches.length > 1 ? "s" : ""}
              </span>

              <Chevron />
            </summary>

            <div className="grid gap-1 border-t border-[var(--border)] p-3">
              {g.matches.map((m) => (
                <MatchRow key={m.id} match={m} bare />
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}
