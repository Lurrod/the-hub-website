import { listTournaments } from "@/lib/data/tournaments";
import { REGIONS, TOURNAMENT_STATUSES } from "@/lib/constants";
import TournamentCard from "@/components/tournament-card";
import TournamentFilters from "@/components/tournament-filters";
import SectionHeader from "@/components/section-header";

export default async function TournamentsPage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string; status?: string }>;
}) {
  const { region: rawRegion, status: rawStatus } = await searchParams;
  const region = (REGIONS as readonly string[]).includes(rawRegion ?? "") ? rawRegion : undefined;
  const status = (TOURNAMENT_STATUSES as readonly string[]).includes(rawStatus ?? "")
    ? rawStatus
    : undefined;
  const tournaments = await listTournaments({ region, status });
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-4">
        <SectionHeader eyebrow="Compétitions" title="Tournois" />
      </div>
      <div className="mb-6">
        <TournamentFilters activeRegion={region} activeStatus={status} />
      </div>
      {tournaments.length === 0 ? (
        <p className="text-[var(--text-muted)]">Aucun tournoi pour ce filtre.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((t) => (
            <TournamentCard key={t.id} tournament={t} />
          ))}
        </div>
      )}
    </main>
  );
}
