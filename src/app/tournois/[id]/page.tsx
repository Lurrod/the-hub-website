import Link from "next/link";
import { notFound } from "next/navigation";
import { getTournament } from "@/lib/data/tournaments";
import { getGroupsWithMatches, listBracketMatches } from "@/lib/data/matches";
import { computeStandings } from "@/lib/standings";
import StandingsTable from "@/components/standings-table";
import Bracket from "@/components/bracket";
import StatusBadge from "@/components/status-badge";
import {
  TOURNAMENT_FORMAT_LABELS,
  TOURNAMENT_STATUS_LABELS,
  type TournamentFormat,
  type TournamentStatus,
} from "@/lib/constants";

export default async function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournament = await getTournament(id);
  if (!tournament) notFound();

  const [groups, bracket] = await Promise.all([
    getGroupsWithMatches(id),
    listBracketMatches(id),
  ]);

  const fmt = (d: Date | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : null);
  const dateRange =
    [fmt(tournament.startDate), fmt(tournament.endDate)].filter(Boolean).join(" → ") ||
    "Dates à définir";

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      {tournament.banner && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={tournament.banner} alt="" className="mb-6 h-40 w-full rounded-lg object-cover" />
      )}
      <div className="flex items-center gap-4">
        {tournament.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tournament.logo} alt="" className="h-16 w-16 rounded-lg object-cover" />
        ) : (
          <div className="grid h-16 w-16 place-items-center rounded-lg bg-[var(--card)] text-[var(--text-muted)]">
            {tournament.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div>
          <div className="eyebrow mb-1.5">Tournoi</div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{tournament.name}</h1>
            <StatusBadge
              label={TOURNAMENT_STATUS_LABELS[tournament.status as TournamentStatus]}
              status={tournament.status}
            />
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            {tournament.region} · {dateRange} ·{" "}
            {TOURNAMENT_FORMAT_LABELS[tournament.format as TournamentFormat]}
          </p>
        </div>
      </div>

      {tournament.description && (
        <p className="mt-4 whitespace-pre-line text-sm text-[var(--text)]">{tournament.description}</p>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {groups.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-white">Poules</h2>
              <div className="grid gap-6 sm:grid-cols-2">
                {groups.map((g) => {
                  const teamIds = g.participants.map((p) => p.teamId);
                  const teamById = new Map(g.participants.map((p) => [p.teamId, p.team]));
                  const standings = computeStandings(
                    teamIds,
                    g.matches.map((m) => ({
                      teamAId: m.teamAId,
                      teamBId: m.teamBId,
                      scoreA: m.scoreA,
                      scoreB: m.scoreB,
                    }))
                  );
                  const rows = standings.map((s) => {
                    const team = teamById.get(s.teamId);
                    return {
                      teamId: s.teamId,
                      teamName: team?.name ?? s.teamId,
                      teamTag: team?.tag ?? "?",
                      played: s.played,
                      wins: s.wins,
                      losses: s.losses,
                      mapDiff: s.mapDiff,
                    };
                  });
                  return (
                    <div key={g.id}>
                      <h3 className="mb-2 text-sm font-semibold text-white">{g.name}</h3>
                      <StandingsTable rows={rows} />
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">Bracket</h2>
            <Bracket
              matches={bracket.map((m) => ({
                id: m.id,
                round: m.round,
                teamAId: m.teamAId,
                teamBId: m.teamBId,
                scoreA: m.scoreA,
                scoreB: m.scoreB,
                winnerId: m.winnerId,
                teamA: m.teamA ? { tag: m.teamA.tag } : null,
                teamB: m.teamB ? { tag: m.teamB.tag } : null,
              }))}
            />
          </section>
        </div>

        <aside className="space-y-8 lg:col-span-1">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">Équipes inscrites</h2>
            {tournament.participants.length === 0 ? (
              <p className="text-[var(--text-muted)]">Aucune équipe inscrite pour le moment.</p>
            ) : (
              <ul className="grid gap-1.5">
                {tournament.participants.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/equipes/${p.teamId}`}
                      className="flex items-center justify-between rounded border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm transition-colors hover:border-[var(--accent)]"
                    >
                      <span className="truncate text-white">{p.team.name}</span>
                      {p.seed != null && (
                        <span className="shrink-0 text-xs text-[var(--text-muted)]">#{p.seed}</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {(tournament.organizer || tournament.prizePool) && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-white">Infos</h2>
              <dl className="grid gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 text-sm">
                {tournament.organizer && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--text-muted)]">Organisateur</dt>
                    <dd className="text-white">{tournament.organizer}</dd>
                  </div>
                )}
                {tournament.prizePool && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--text-muted)]">Cash prize</dt>
                    <dd className="text-white">{tournament.prizePool}</dd>
                  </div>
                )}
              </dl>
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}
