import { listTournamentsWithMatches, listUpcomingMatches } from "@/lib/data/matches";
import MatchRow from "@/components/match-row";
import StatusBadge from "@/components/status-badge";
import { TOURNAMENT_STATUS_LABELS, type TournamentStatus } from "@/lib/constants";
import SectionHeader from "@/components/section-header";

export default async function MatchesPage() {
  const [tournaments, upcoming] = await Promise.all([
    listTournamentsWithMatches(),
    listUpcomingMatches(),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <SectionHeader eyebrow="Calendrier" title="Matchs" />
      </div>

      {upcoming.length > 0 && (
        <section className="mb-8">
          <SectionHeader eyebrow="À venir" title="Prochains matchs" />
          <div className="grid gap-2">
            {upcoming.map((m) => (
              <MatchRow
                key={m.id}
                match={{
                  id: m.id,
                  teamAId: m.teamAId,
                  teamBId: m.teamBId,
                  scoreA: m.scoreA,
                  scoreB: m.scoreB,
                  winnerId: m.winnerId,
                  status: m.status,
                  date: m.date,
                  bestOf: m.bestOf,
                  vodUrl: m.vodUrl,
                  teamA: m.teamA ? { name: m.teamA.name, tag: m.teamA.tag, logo: m.teamA.logo } : null,
                  teamB: m.teamB ? { name: m.teamB.name, tag: m.teamB.tag, logo: m.teamB.logo } : null,
                  contextLabel: m.tournament.name,
                }}
              />
            ))}
          </div>
        </section>
      )}

      {tournaments.length === 0 ? (
        <p className="text-[var(--text-muted)]">Aucun match pour le moment.</p>
      ) : (
        <div className="grid gap-3">
          {tournaments.map((t) => (
            <details
              key={t.id}
              open={t.status === "ONGOING"}
              className="group overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-[var(--category)] px-4 py-3 transition-colors duration-[130ms] hover:bg-[var(--card-hover)] [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-2">
                  <span className="font-semibold text-white">{t.name}</span>
                  <StatusBadge
                    label={TOURNAMENT_STATUS_LABELS[t.status as TournamentStatus]}
                    status={t.status}
                  />
                </span>
                <span className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
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
              <div className="grid gap-2 border-t border-[var(--border)] p-3">
                {t.matches.map((m) => (
                  <MatchRow
                    key={m.id}
                    match={{
                      id: m.id,
                      teamAId: m.teamAId,
                      teamBId: m.teamBId,
                      scoreA: m.scoreA,
                      scoreB: m.scoreB,
                      winnerId: m.winnerId,
                      status: m.status,
                      date: m.date,
                      bestOf: m.bestOf,
                      vodUrl: m.vodUrl,
                      teamA: m.teamA ? { name: m.teamA.name, tag: m.teamA.tag, logo: m.teamA.logo } : null,
                      teamB: m.teamB ? { name: m.teamB.name, tag: m.teamB.tag, logo: m.teamB.logo } : null,
                      contextLabel: m.stage === "BRACKET" ? m.round ?? "Playoffs" : m.group?.name ?? "Poule",
                    }}
                  />
                ))}
              </div>
            </details>
          ))}
        </div>
      )}
    </main>
  );
}
