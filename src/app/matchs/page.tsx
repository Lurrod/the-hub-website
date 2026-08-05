import Link from "next/link";
import Segmented from "@/components/segmented";
import { listTournamentsWithMatches } from "@/lib/data/matches";
import { MatchListItem } from "@/components/tournament-match-list";
import Pagination from "@/components/pagination";
import { parsePage } from "@/lib/pagination";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  path: "/matchs",
  title: "Matchs",
  description:
    "Tous les matchs du Tier 3 Valorant francophone, tournoi par tournoi, avec leurs scores.",
});

const FILTERS = [
  { key: "all", label: "Tout" },
  { key: "upcoming", label: "À venir" },
  { key: "finished", label: "Terminé" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string; p?: string }>;
}) {
  const { f, p } = await searchParams;
  const filter: FilterKey = FILTERS.some((x) => x.key === f) ? (f as FilterKey) : "all";

  // Le filtre et la pagination descendent jusqu'à la requête : la page ne
  // charge plus tous les matchs du site pour n'en afficher qu'une poignée.
  const { tournaments, total, page, pageSize } = await listTournamentsWithMatches({
    filter,
    page: parsePage(p),
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">Matchs</h1>

      <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <Segmented activeKey={filter} className="mb-4">
          {FILTERS.map((x) => (
            <Link
              key={x.key}
              href={x.key === "all" ? "/matchs" : `/matchs?f=${x.key}`}
              className="t-tab"
              role="tab"
              aria-selected={filter === x.key}
            >
              {x.label}
            </Link>
          ))}
        </Segmented>

        {tournaments.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">Aucun match pour ce filtre.</p>
        ) : (
          <div className="space-y-6">
            {tournaments.map((t) => (
              <details key={t.id} open={t.status === "ONGOING"} className="t-resize-details group">
                <summary className="mb-2 flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg bg-[#242832] px-3 py-2 [&::-webkit-details-marker]:hidden">
                  <span className="truncate text-xs font-semibold uppercase tracking-wide text-white">
                    {t.name}
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-[var(--text-muted)]">
                    {/* Le compte annoncé est le total réel, pas la longueur de
                        la liste : au-delà du plafond par tournoi, on le dit
                        plutôt que de laisser croire à un affichage complet. */}
                    {t._count.matches} match{t._count.matches > 1 ? "s" : ""}
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
                {t._count.matches > t.matches.length && (
                  <p className="px-3 py-2 text-xs text-[var(--text-muted)]">
                    {t.matches.length} matchs sur {t._count.matches} affichés.{" "}
                    <Link href={`/tournois/${t.id}`} className="text-[var(--accent)]">
                      Voir tout le tournoi
                    </Link>
                  </p>
                )}
              </details>
            ))}
          </div>
        )}

        <Pagination
          basePath="/matchs"
          params={{ f: filter === "all" ? undefined : filter }}
          page={page}
          pageSize={pageSize}
          total={total}
          label="tournois"
        />
      </div>
    </main>
  );
}
