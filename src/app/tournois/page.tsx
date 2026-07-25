import { listTournaments } from "@/lib/data/tournaments";
import { REGIONS, TOURNAMENT_STATUSES } from "@/lib/constants";
import TournamentFilters from "@/components/tournament-filters";
import TournamentListRow from "@/components/tournament-list-row";
import SectionHeader from "@/components/section-header";
import { monthKey, monthLabel, daysUntil } from "@/lib/dates";

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
  const now = new Date();

  // Regroupe par mois en préservant l'ordre (startDate desc renvoyé par la requête).
  const months: { key: string; label: string; items: typeof tournaments }[] = [];
  for (const t of tournaments) {
    const k = monthKey(t.startDate);
    const last = months[months.length - 1];
    if (last && last.key === k) last.items.push(t);
    else months.push({ key: k, label: monthLabel(t.startDate), items: [t] });
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <SectionHeader eyebrow="Compétitions" title="Tournois" />
      <div className="my-6">
        <TournamentFilters activeRegion={region} activeStatus={status} />
      </div>

      {tournaments.length === 0 ? (
        <p className="text-[var(--text-muted)]">Aucun tournoi pour ce filtre.</p>
      ) : (
        <div className="space-y-8">
          {months.map((mo) => (
            <section key={mo.key}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                {mo.label}
              </h2>
              <div className="stagger-in space-y-2">
                {mo.items.map((t) => (
                  <TournamentListRow
                    key={t.id}
                    t={{
                      id: t.id,
                      name: t.name,
                      logo: t.logo,
                      startDate: t.startDate,
                      prizePool: t.prizePool,
                      teamCount: t._count.participants,
                      days: daysUntil(t.startDate, now),
                    }}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
