import Link from "next/link";
import { listLftPlayers, listLftCountries } from "@/lib/data/players";
import { listLfpTeams } from "@/lib/data/teams";
import {
  normalizeAccountType,
  normalizeLftRole,
  normalizeLftCountry,
  normalizeAgeBracket,
  normalizeTeamStatus,
  normalizeLftSearch,
  birthdateRangeForAge,
  type LftFilters,
} from "@/lib/lft";
import {
  LFT_VIEWS,
  normalizeLfpRole,
  normalizeLfpSearch,
  normalizeLftView,
  type LfpFilters,
} from "@/lib/lfp";
import LftCard from "@/components/lft-card";
import EmptyState, { ListDecor } from "@/components/empty-state";
import LftFiltersBar from "@/components/lft-filters";
import LfpCard from "@/components/lfp-card";
import LfpFiltersBar from "@/components/lfp-filters";
import Segmented from "@/components/segmented";
import Pagination from "@/components/pagination";
import { parsePage } from "@/lib/pagination";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  path: "/lft",
  title: "LFT / LFP",
  description:
    "Les joueurs à la recherche d'une équipe et les équipes qui recrutent, sur la scène T3 Valorant francophone.",
});

type Params = {
  vue?: string;
  type?: string;
  role?: string;
  country?: string;
  age?: string;
  team?: string;
  q?: string;
  p?: string;
};

/**
 * Page du marché des transferts, dans les deux sens.
 *
 * Une seule page pour les deux moitiés : un joueur libre et une équipe qui
 * recrute se cherchent mutuellement, les séparer sur deux URL obligerait à
 * connaître l'existence de l'autre. L'onglet actif voyage dans `?vue=` pour
 * qu'un lien filtré reste partageable.
 */
export default async function LftPage({ searchParams }: { searchParams: Promise<Params> }) {
  const raw = await searchParams;
  const view = normalizeLftView(raw.vue);
  const page = parsePage(raw.p);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
        LFT / LFP
      </h1>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        {view === "lft"
          ? "Les joueurs en recherche d'équipe. Active ton propre statut depuis tes paramètres."
          : "Les équipes qui recrutent. Publie ton annonce depuis la gestion de ton équipe."}
      </p>

      <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        {/* Changer d'onglet repart d'une page propre : les filtres des deux
            moitiés ne portent pas sur les mêmes objets. */}
        <Segmented
          nav="Filtrer par type de profil"
          activeKey={view}
          className="mb-4 justify-self-start"
        >
          {LFT_VIEWS.map((v) => (
            <Link
              key={v.key}
              href={v.key === "lft" ? "/lft" : "/lft?vue=lfp"}
              className="t-tab"
              aria-current={view === v.key ? "page" : undefined}
            >
              {v.label}
            </Link>
          ))}
        </Segmented>

        {view === "lft" ? <LftView raw={raw} page={page} /> : <LfpView raw={raw} page={page} />}
      </div>
    </main>
  );
}

/** Moitié « joueurs libres ». */
async function LftView({ raw, page }: { raw: Params; page: number }) {
  // Les filtres viennent de l'URL : on ne garde que des valeurs connues (rôle
  // Valorant existant, pays réellement présent, tranche d'âge et statut
  // déclarés) avant d'interroger la base.
  const countries = await listLftCountries();
  const filters: LftFilters = {
    type: normalizeAccountType(raw.type),
    role: normalizeLftRole(raw.role),
    country: normalizeLftCountry(raw.country, countries),
    age: normalizeAgeBracket(raw.age),
    team: normalizeTeamStatus(raw.team),
    q: normalizeLftSearch(raw.q),
  };

  const {
    players,
    total,
    pageSize,
    page: current,
  } = await listLftPlayers({ ...filters, birthdate: birthdateRangeForAge(filters.age) }, page);

  return (
    <>
      <div className="mb-4">
        {/* Le compteur annonce le total filtré, pas la page courante. */}
        <LftFiltersBar filters={filters} countries={countries} total={total} />
      </div>

      {players.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">
          Personne en recherche d&apos;équipe pour ces filtres.
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
                accountType: p.accountType,
              }}
            />
          ))}
        </div>
      )}

      <Pagination
        basePath="/lft"
        params={{
          type: filters.type,
          role: filters.role,
          country: filters.country,
          age: filters.age,
          team: filters.team,
          q: filters.q,
        }}
        page={current}
        pageSize={pageSize}
        total={total}
        label="joueurs"
      />
    </>
  );
}

/** Moitié « équipes qui recrutent ». */
async function LfpView({ raw, page }: { raw: Params; page: number }) {
  const filters: LfpFilters = {
    role: normalizeLfpRole(raw.role),
    q: normalizeLfpSearch(raw.q),
  };

  const { teams, total, pageSize, page: current } = await listLfpTeams(filters, page);

  return (
    <>
      <div className="mb-4">
        <LfpFiltersBar filters={filters} total={total} />
      </div>

      {teams.length === 0 ? (
        <EmptyState
          title="Aucune équipe ne recrute pour ces filtres"
          description="Les annonces d'équipes en recherche de joueurs apparaissent ici. Une équipe peut en publier une depuis son écran de gestion."
          decor={<ListDecor />}
        />
      ) : (
        <div className="stagger-in grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {teams.map((t) => (
            <LfpCard
              key={t.id}
              team={{
                id: t.id,
                name: t.name,
                tag: t.tag,
                logo: t.logo,
                region: t.region,
                lfpRoles: t.lfpRoles,
                lfpMessage: t.lfpMessage,
                rosterCount: t._count.memberships,
              }}
            />
          ))}
        </div>
      )}

      <Pagination
        basePath="/lft"
        params={{ vue: "lfp", role: filters.role, q: filters.q }}
        page={current}
        pageSize={pageSize}
        total={total}
        label="équipes"
      />
    </>
  );
}
