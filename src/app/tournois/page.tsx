import { listTournaments } from "@/lib/data/tournaments";
import EmptyState, { ListDecor } from "@/components/empty-state";
import { REGIONS, TOURNAMENT_STATUSES } from "@/lib/constants";
import TournamentFilters from "@/components/tournament-filters";
import TournamentListRow from "@/components/tournament-list-row";
import { monthKey, monthLabel, daysUntil } from "@/lib/dates";
import { pageMetadata } from "@/lib/metadata";
import JsonLdScript from "@/components/json-ld";
import { itemListJsonLd } from "@/lib/structured-data";

export const metadata = pageMetadata({
  path: "/tournois",
  title: "Tournois",
  description:
    "Tous les tournois du Tier 3 Valorant francophone : calendrier, format, équipes inscrites et résultats.",
});

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
      <JsonLdScript
        data={itemListJsonLd(
          "Tournois",
          tournaments.map((t) => ({ path: `/tournois/${t.id}`, name: t.name }))
        )}
      />
      <h1 className="text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
        Tournois
      </h1>

      <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="mb-4">
          <TournamentFilters activeRegion={region} activeStatus={status} />
        </div>

        {tournaments.length === 0 ? (
          <EmptyState
            title="Aucun tournoi pour ce filtre"
            description="Les compétitions inscrites sur The Hub apparaissent ici, de la phase de poules à la finale."
            decor={<ListDecor />}
          />
        ) : (
          <div className="space-y-6">
            {months.map((mo) => (
              <section key={mo.key}>
                <div className="mb-2 rounded-lg bg-[var(--card-hover)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  {mo.label}
                </div>
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
      </div>
    </main>
  );
}
