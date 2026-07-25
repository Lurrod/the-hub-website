import { searchAll } from "@/lib/data/search";
import TeamCard from "@/components/team-card";
import PlayerCard from "@/components/player-card";
import TournamentCard from "@/components/tournament-card";
import SectionHeader from "@/components/section-header";

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
      <div className="mb-6">
        <SectionHeader eyebrow="Explorer" title="Recherche" />
      </div>

      <form action="/recherche" method="get" className="mb-8">
        <input
          name="q"
          defaultValue={q}
          placeholder="Équipe, joueur ou tournoi…"
          aria-label="Rechercher"
          className="w-full max-w-md rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-white placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
        />
      </form>

      {q.length === 0 ? (
        <p className="text-[var(--text-muted)]">Saisis un terme pour lancer la recherche.</p>
      ) : total === 0 ? (
        <p className="text-[var(--text-muted)]">Aucun résultat pour « {q} ».</p>
      ) : (
        <div className="space-y-10">
          {results.teams.length > 0 && (
            <section>
              <h2 className="eyebrow mb-3">
                Équipes ({results.teams.length})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {results.teams.map((t) => (
                  <TeamCard key={t.id} team={t} />
                ))}
              </div>
            </section>
          )}
          {results.players.length > 0 && (
            <section>
              <h2 className="eyebrow mb-3">
                Joueurs ({results.players.length})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {results.players.map((p) => (
                  <PlayerCard key={p.id} player={p} />
                ))}
              </div>
            </section>
          )}
          {results.tournaments.length > 0 && (
            <section>
              <h2 className="eyebrow mb-3">
                Tournois ({results.tournaments.length})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {results.tournaments.map((t) => (
                  <TournamentCard key={t.id} tournament={t} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
