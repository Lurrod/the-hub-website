import { listTeams } from "@/lib/data/teams";
import { REGIONS } from "@/lib/constants";
import TeamCard from "@/components/team-card";
import RegionFilter from "@/components/region-filter";

export const metadata = { title: "Équipes" };

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string }>;
}) {
  const { region: rawRegion } = await searchParams;
  // On n'accepte que les régions connues (rejette toute valeur d'URL arbitraire).
  const region = (REGIONS as readonly string[]).includes(rawRegion ?? "") ? rawRegion : undefined;
  const teams = await listTeams({ region });

  // Regroupe par région. On n'exclut aucune équipe : les régions connues (REGIONS)
  // passent en premier, puis toute autre région réellement présente dans les données.
  const present = Array.from(new Set(teams.map((t) => t.region)));
  const known = REGIONS as readonly string[];
  const orderedRegions = [
    ...known.filter((r) => present.includes(r)),
    ...present.filter((r) => !known.includes(r)).sort(),
  ];
  const groups = orderedRegions.map((r) => ({
    region: r,
    items: teams.filter((t) => t.region === r),
  }));

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">Équipes</h1>

      <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="mb-4">
          <RegionFilter active={region} />
        </div>

        {teams.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">Aucune équipe pour ce filtre.</p>
        ) : (
          <div className="space-y-6">
            {groups.map((g) => (
              <section key={g.region}>
                <div className="mb-3 flex items-center justify-between gap-2 rounded-lg bg-[#242832] px-3 py-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-white">
                    {g.region}
                  </span>
                  <span className="shrink-0 text-xs text-[var(--text-muted)]">
                    {g.items.length} équipe{g.items.length > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="stagger-in grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {g.items.map((t) => (
                    <TeamCard key={t.id} team={t} />
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
