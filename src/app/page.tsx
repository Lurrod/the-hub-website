import Link from "next/link";
import { listRecentResults } from "@/lib/data/matches";
import { listTournaments } from "@/lib/data/tournaments";
import MatchRow from "@/components/match-row";
import { TOURNAMENT_STATUS_LABELS, type TournamentStatus } from "@/lib/constants";
import SectionHeader from "@/components/section-header";

export default async function HomePage() {
  const [results, tournaments] = await Promise.all([
    listRecentResults(6),
    listTournaments(),
  ]);
  const liveOrUpcoming = tournaments.filter((t) => t.status !== "FINISHED").slice(0, 8);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8">
        <div className="eyebrow mb-2">T3 Valorant · France</div>
        <h1 className="text-3xl font-bold tracking-tight text-white">The Hub — T3 Valorant</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Référencement des équipes et tournois du Tier 3 Valorant.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <SectionHeader eyebrow="Résultats" title="Derniers résultats" />
          {results.length === 0 ? (
            <p className="text-[var(--text-muted)]">Aucun résultat pour le moment.</p>
          ) : (
            <div className="grid gap-2">
              {results.map((m) => (
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
          )}
        </section>

        <aside className="lg:col-span-1">
          <SectionHeader eyebrow="Compétitions" title="Tournois en cours / à venir" />
          {liveOrUpcoming.length === 0 ? (
            <p className="text-[var(--text-muted)]">Aucun tournoi programmé.</p>
          ) : (
            <ul className="grid gap-2">
              {liveOrUpcoming.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/tournois/${t.id}`}
                    className="card card-interactive block p-3"
                  >
                    <div className="truncate font-medium text-white">{t.name}</div>
                    <div className="text-xs text-[var(--text-muted)]">
                      {t.region} · {TOURNAMENT_STATUS_LABELS[t.status as TournamentStatus]}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </main>
  );
}
