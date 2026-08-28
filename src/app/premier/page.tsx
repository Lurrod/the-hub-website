import Link from "next/link";
import StandingsTable from "@/components/standings-table";
import MatchMiniList from "@/components/match-mini-list";
import EmptyState, { ListDecor } from "@/components/empty-state";
import { getPremierOverview, listPremierResults } from "@/lib/data/premier-view";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  path: "/premier",
  title: "Premier",
  description:
    "Le Premier français sur The Hub : classements Invite et Contender, et les dernières rencontres jouées.",
});

export default async function PremierPage() {
  const [panels, results] = await Promise.all([getPremierOverview(), listPremierResults()]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
        Premier
      </h1>
      <p className="mt-2 text-xs text-[var(--text-muted)]">
        Le Premier français, palier Invite et palier Contender. Classements et résultats suivis
        depuis l&apos;API Riot.
      </p>

      {panels.length === 0 ? (
        <EmptyState
          className="mt-8"
          title="Aucune saison Premier en cours"
          description="Le miroir se remplit dès qu'une saison démarre côté Riot. Les classements et les résultats apparaîtront ici d'eux-mêmes."
          decor={<ListDecor />}
          action={{ label: "Voir les tournois", href: "/tournois" }}
        />
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {panels.map((p) => (
            <section key={p.tournamentId}>
              <h2 className="mb-3 text-sm font-semibold">
                <Link
                  href={`/tournois/${p.tournamentId}`}
                  className="transition-colors hover:text-[var(--accent)]"
                >
                  {p.tournamentName}
                </Link>
              </h2>
              {/* Six colonnes ne tiennent pas dans 390 px : le débordement est
                  contenu ici plutôt que laissé à la page. */}
              <div className="scroll-x rounded-lg border border-[var(--border)]">
                <StandingsTable rows={p.rows} />
              </div>
              <Link
                href={`/tournois/${p.tournamentId}`}
                className="mt-2 inline-block text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]"
              >
                Classement complet
              </Link>
            </section>
          ))}
        </div>
      )}

      {results.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
            Derniers résultats
          </h2>
          <MatchMiniList matches={results} />
        </section>
      )}
    </main>
  );
}
