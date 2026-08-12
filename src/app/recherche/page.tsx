import { searchAll } from "@/lib/data/search";
import EmptyState, { ListDecor } from "@/components/empty-state";
import TeamCard from "@/components/team-card";
import PlayerCard from "@/components/player-card";
import TournamentCard from "@/components/tournament-card";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({ path: "/recherche", title: "Recherche" });

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: rawQ } = await searchParams;
  const q = (rawQ ?? "").trim();
  const results = await searchAll(q);
  const total = results.teams.length + results.players.length + results.tournaments.length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
        Recherche
      </h1>

      <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <form action="/recherche" method="get" className="mb-4">
          <input
            name="q"
            defaultValue={q}
            placeholder="Équipe, joueur ou tournoi…"
            aria-label="Rechercher"
            className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[#191c22] px-3 py-2 text-sm text-white placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
          />
        </form>

        {q.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            Saisis un terme pour lancer la recherche.
          </p>
        ) : total === 0 ? (
          <EmptyState
            title={`Aucun résultat pour « ${q} »`}
            description="La recherche porte sur les joueurs, les équipes et les tournois. Vérifie l'orthographe, ou essaie un terme plus court."
            decor={<ListDecor />}
          />
        ) : (
          <div className="space-y-6">
            {results.teams.length > 0 && (
              <section>
                <div className="mb-3 flex items-center justify-between gap-2 rounded-lg bg-[#242832] px-3 py-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-white">
                    Équipes
                  </span>
                  <span className="shrink-0 text-xs text-[var(--text-muted)]">
                    {results.teams.length} résultat{results.teams.length > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="stagger-in grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {results.teams.map((t) => (
                    <TeamCard key={t.id} team={t} />
                  ))}
                </div>
              </section>
            )}
            {results.players.length > 0 && (
              <section>
                <div className="mb-3 flex items-center justify-between gap-2 rounded-lg bg-[#242832] px-3 py-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-white">
                    Joueurs
                  </span>
                  <span className="shrink-0 text-xs text-[var(--text-muted)]">
                    {results.players.length} résultat{results.players.length > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="stagger-in grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {results.players.map((p) => (
                    <PlayerCard key={p.id} player={p} />
                  ))}
                </div>
              </section>
            )}
            {results.tournaments.length > 0 && (
              <section>
                <div className="mb-3 flex items-center justify-between gap-2 rounded-lg bg-[#242832] px-3 py-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-white">
                    Tournois
                  </span>
                  <span className="shrink-0 text-xs text-[var(--text-muted)]">
                    {results.tournaments.length} résultat{results.tournaments.length > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="stagger-in grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {results.tournaments.map((t) => (
                    <TournamentCard key={t.id} tournament={t} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
