import { listLftPlayers, listLftCountries } from "@/lib/data/players";
import { normalizeLftRole, normalizeLftCountry } from "@/lib/lft";
import LftCard from "@/components/lft-card";
import LftFilters from "@/components/lft-filters";

export const metadata = { title: "LFT" };

export default async function LftPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; country?: string }>;
}) {
  const { role: rawRole, country: rawCountry } = await searchParams;

  // Les filtres viennent de l'URL : on ne garde que des valeurs connues
  // (rôle Valorant existant, pays réellement présent) avant d'interroger la base.
  const countries = await listLftCountries();
  const role = normalizeLftRole(rawRole);
  const country = normalizeLftCountry(rawCountry, countries);

  const players = await listLftPlayers({ role, country });

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">LFT</h1>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        Les joueurs en recherche d&apos;équipe. Active ton propre statut depuis tes paramètres.
      </p>

      <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="mb-4">
          <LftFilters role={role} country={country} countries={countries} />
        </div>

        {players.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            Aucun joueur en recherche d&apos;équipe pour ce filtre.
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
                  lftSince: p.lftSince,
                  team: p.memberships[0]
                    ? { name: p.memberships[0].team.name, tag: p.memberships[0].team.tag }
                    : null,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
