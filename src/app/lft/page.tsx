import { listLftPlayers, listLftCountries } from "@/lib/data/players";
import {
  normalizeLftRole,
  normalizeLftCountry,
  normalizeAgeBracket,
  normalizeTeamStatus,
  normalizeLftSearch,
  birthdateRangeForAge,
  type LftFilters,
} from "@/lib/lft";
import LftCard from "@/components/lft-card";
import LftFiltersBar from "@/components/lft-filters";
import Pagination from "@/components/pagination";
import { parsePage } from "@/lib/pagination";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  path: "/lft",
  title: "LFT",
  description:
    "Les joueurs à la recherche d'une équipe (looking for team) sur la scène T3 Valorant francophone.",
});

export default async function LftPage({
  searchParams,
}: {
  searchParams: Promise<{
    role?: string;
    country?: string;
    age?: string;
    team?: string;
    q?: string;
    p?: string;
  }>;
}) {
  const raw = await searchParams;

  // Les filtres viennent de l'URL : on ne garde que des valeurs connues (rôle
  // Valorant existant, pays réellement présent, tranche d'âge et statut
  // déclarés) avant d'interroger la base.
  const countries = await listLftCountries();
  const filters: LftFilters = {
    role: normalizeLftRole(raw.role),
    country: normalizeLftCountry(raw.country, countries),
    age: normalizeAgeBracket(raw.age),
    team: normalizeTeamStatus(raw.team),
    q: normalizeLftSearch(raw.q),
  };

  const { players, total, page, pageSize } = await listLftPlayers(
    { ...filters, birthdate: birthdateRangeForAge(filters.age) },
    parsePage(raw.p)
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">LFT</h1>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        Les joueurs en recherche d&apos;équipe. Active ton propre statut depuis tes paramètres.
      </p>

      <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="mb-4">
          {/* Le compteur annonce le total filtré, pas la page courante. */}
          <LftFiltersBar filters={filters} countries={countries} total={total} />
        </div>

        {players.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            Aucun joueur en recherche d&apos;équipe pour ces filtres.
          </p>
        ) : (
          <div className="stagger-in grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {players.map((p) => (
              <LftCard
                key={p.id}
                player={{
                  id: p.id,
                  pseudo: p.pseudo,
                  photo: p.photo,
                  nationality: p.nationality,
                  valorantRole: p.valorantRole,
                }}
              />
            ))}
          </div>
        )}

        <Pagination
          basePath="/lft"
          params={{
            role: filters.role,
            country: filters.country,
            age: filters.age,
            team: filters.team,
            q: filters.q,
          }}
          page={page}
          pageSize={pageSize}
          total={total}
          label="joueurs"
        />
      </div>
    </main>
  );
}
