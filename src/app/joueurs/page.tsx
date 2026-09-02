import { listPlayersDirectory } from "@/lib/data/players-directory";
import {
  normalizePlayerRole,
  normalizePlayerSearch,
  normalizePlayerSort,
  normalizePlayerTeamFilter,
  directoryParams,
  type PlayerDirectoryFilters,
} from "@/lib/players-directory";
import PlayerDirectory from "@/components/player-directory";
import DirectoryFiltersBar from "@/components/player-directory-filters";
import Pagination from "@/components/pagination";
import { pageOffset, parsePage } from "@/lib/pagination";
import { pageMetadata } from "@/lib/metadata";
import JsonLdScript from "@/components/json-ld";
import { itemListJsonLd } from "@/lib/structured-data";

/**
 * Canonique conscient de la pagination : `?p=5` se déclare lui-même et non
 * la page 1. Statique, la métadonnée faisait dire à chaque page de rang
 * supérieur qu'elle était un doublon de la première — un signal explicite de
 * ne pas l'indexer.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; team?: string; q?: string; sort?: string; p?: string }>;
}) {
  const { p } = await searchParams;
  return pageMetadata({
    path: "/joueurs",
    title: "Joueurs",
    description:
      "Tous les joueurs du Tier 3 Valorant francophone, classés par rating, ACS et cartes jouées.",
    page: parsePage(p),
  });
}

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; team?: string; q?: string; sort?: string; p?: string }>;
}) {
  const raw = await searchParams;

  // Comme sur /lft : rien de ce qui vient de l'URL n'atteint la requête sans
  // avoir été ramené à une valeur connue.
  const filters: PlayerDirectoryFilters = {
    role: normalizePlayerRole(raw.role),
    team: normalizePlayerTeamFilter(raw.team),
    q: normalizePlayerSearch(raw.q),
    sort: normalizePlayerSort(raw.sort),
  };

  const { players, total, page, pageSize } = await listPlayersDirectory(filters, parsePage(raw.p));

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <JsonLdScript
        data={itemListJsonLd(
          "Joueurs",
          players.map((p) => ({ path: `/joueurs/${p.id}`, name: p.pseudo }))
        )}
      />
      <h1 className="text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
        Joueurs
      </h1>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        Le classement de la scène, calculé sur les cartes jouées en tournoi. Les joueurs sans partie
        importée figurent en fin de liste.
      </p>

      <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="mb-4">
          <DirectoryFiltersBar filters={filters} total={total} />
        </div>

        <PlayerDirectory
          players={players}
          offset={pageOffset(page, pageSize)}
          ranked={filters.sort !== "pseudo"}
        />

        <Pagination
          basePath="/joueurs"
          params={directoryParams(filters)}
          page={page}
          pageSize={pageSize}
          total={total}
          label="joueurs"
        />
      </div>
    </main>
  );
}
