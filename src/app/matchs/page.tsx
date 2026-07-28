import Link from "next/link";
import { listTournamentsWithMatches } from "@/lib/data/matches";
import { MatchListItem } from "@/components/tournament-match-list";

export const metadata = { title: "Matchs" };

const FILTERS = [
  { key: "all", label: "Tout" },
  { key: "upcoming", label: "À venir" },
  { key: "finished", label: "Terminé" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

function matchMatchesFilter(status: string, filter: FilterKey): boolean {
  if (filter === "finished") return status === "FINISHED";
  if (filter === "upcoming") return status !== "FINISHED";
  return true;
}

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string }>;
}) {
  const { f } = await searchParams;
  const filter: FilterKey = FILTERS.some((x) => x.key === f) ? (f as FilterKey) : "all";

  const allTournaments = await listTournamentsWithMatches();
  const tournaments = allTournaments
    .map((t) => ({ ...t, matches: t.matches.filter((m) => matchMatchesFilter(m.status, filter)) }))
    .filter((t) => t.matches.length > 0);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">Matchs</h1>

      <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="mb-4 flex flex-wrap gap-2">
          {FILTERS.map((x) => (
            <Link
              key={x.key}
              href={x.key === "all" ? "/matchs" : `/matchs?f=${x.key}`}
              className="chip rounded-lg data-[active=true]:text-white"
              data-active={filter === x.key}
            >
              {x.label}
            </Link>
          ))}
        </div>

        {tournaments.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">Aucun match pour ce filtre.</p>
        ) : (
          <div className="space-y-6">
            {tournaments.map((t) => (
              <details key={t.id} open={t.status === "ONGOING"} className="group">
                <summary className="mb-2 flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg bg-[#242832] px-3 py-2 [&::-webkit-details-marker]:hidden">
                  <span className="truncate text-xs font-semibold uppercase tracking-wide text-white">
                    {t.name}
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-[var(--text-muted)]">
                    {t.matches.length} match{t.matches.length > 1 ? "s" : ""}
                    <svg
                      className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
                    </svg>
                  </span>
                </summary>
                <ul className="divide-y divide-[var(--border)]">
                  {t.matches.map((m) => (
                    <MatchListItem
                      key={m.id}
                      m={{
                        id: m.id,
                        date: m.date,
                        status: m.status,
                        scoreA: m.scoreA,
                        scoreB: m.scoreB,
                        stageLabel:
                          m.stage === "BRACKET"
                            ? m.round ?? "Playoffs"
                            : m.group?.name ?? "Poule",
                        teamA: m.teamA ? { name: m.teamA.name, logo: m.teamA.logo } : null,
                        teamB: m.teamB ? { name: m.teamB.name, logo: m.teamB.logo } : null,
                      }}
                    />
                  ))}
                </ul>
              </details>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
