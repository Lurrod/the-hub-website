import { listTeams } from "@/lib/data/teams";
import { REGIONS } from "@/lib/constants";
import TeamCard from "@/components/team-card";
import RegionFilter from "@/components/region-filter";
import SectionHeader from "@/components/section-header";

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string }>;
}) {
  const { region: rawRegion } = await searchParams;
  // On n'accepte que les régions connues (rejette toute valeur d'URL arbitraire).
  const region = (REGIONS as readonly string[]).includes(rawRegion ?? "")
    ? rawRegion
    : undefined;
  const teams = await listTeams({ region });
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-4">
        <SectionHeader eyebrow="Annuaire" title="Équipes" />
      </div>
      <div className="mb-6">
        <RegionFilter active={region} />
      </div>
      {teams.length === 0 ? (
        <p className="text-[var(--text-muted)]">Aucune équipe pour ce filtre.</p>
      ) : (
        <div className="stagger-in grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {teams.map((t) => (
            <TeamCard key={t.id} team={t} />
          ))}
        </div>
      )}
    </main>
  );
}
