import Link from "next/link";
import StandingsTable from "@/components/standings-table";
import MatchMiniList from "@/components/match-mini-list";
import EmptyState, { ListDecor } from "@/components/empty-state";
import { getPremierOverview } from "@/lib/data/premier-view";
import { pageMetadata } from "@/lib/metadata";

/**
 * La page lit la base sans aucune entrée dynamique — ni `params`, ni
 * `searchParams`. Next la juge donc prérendable et l'exécute au build, où elle
 * tombe sur le `DATABASE_URL` factice de la CI : « Authentication failed against
 * database server ». Les autres pages de liste y échappent par accident, en
 * attendant `searchParams` pour leurs filtres.
 */
export const dynamic = "force-dynamic";

export const metadata = pageMetadata({
  path: "/premier",
  title: "Premier",
  description:
    "Le Premier français sur The Hub : classements Invite et Contender, et les dernières rencontres jouées.",
});

export default async function PremierPage() {
  const panels = await getPremierOverview();

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
        <div className="mt-8 grid items-start gap-x-6 gap-y-10 md:grid-cols-2">
          {panels.map((p) => (
            <section key={p.tournamentId} className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold">
                <Link
                  href={`/tournois/${p.tournamentId}`}
                  className="transition-colors hover:text-[var(--accent)]"
                >
                  {p.tournamentName}
                </Link>
              </h2>

              {/* `.panel` et pas une bordure improvisée : `.scroll-x` peint ses
                  couvre-bords en `--scroll-x-bg`, qui vaut `--surface`. Sur un
                  conteneur sans fond, ces couvre-bords laissaient deux bandes
                  colorées aux deux bords — le symptôme décrit dans
                  `src/styles/transitions.css`. */}
              <div
                className="panel scroll-x"
                tabIndex={0}
                role="region"
                aria-label="Classement Premier, défilement horizontal"
              >
                <StandingsTable rows={p.rows} />
              </div>

              <Link
                href={`/tournois/${p.tournamentId}`}
                className="self-start rounded-lg border border-[var(--border-strong)] px-4 py-2 text-xs font-semibold text-white transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                Classement complet
              </Link>

              {p.results.length > 0 && (
                <div className="mt-4">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
                    Derniers résultats
                  </h3>
                  <MatchMiniList matches={p.results} />
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
