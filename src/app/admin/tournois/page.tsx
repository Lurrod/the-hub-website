import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-auth";
import { isAdmin } from "@/lib/permissions";
import { listAdminTournaments } from "@/lib/data/admin";
import {
  TOURNAMENT_STATUSES,
  TOURNAMENT_STATUS_LABELS,
  type TournamentStatus,
} from "@/lib/constants";
import AdminSearch from "@/components/admin-search";
import Segmented from "@/components/segmented";
import { EmptyLine } from "@/components/empty-state";

export const metadata = { title: "Admin · Tournois" };

export default async function AdminTournamentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; statut?: string; anomalie?: string }>;
}) {
  const user = await getSessionUser();
  if (!isAdmin(user)) redirect("/");

  const { q, statut, anomalie } = await searchParams;
  const tournaments = await listAdminTournaments({ q, statut, anomalie });

  const href = (s?: string) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (s) sp.set("statut", s);
    if (anomalie) sp.set("anomalie", anomalie);
    const qs = sp.toString();
    return qs ? `/admin/tournois?${qs}` : "/admin/tournois";
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
          Tournois
        </h1>
        <Link
          href="/admin/tournois/nouvelle"
          className="rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
        >
          Nouveau tournoi
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <AdminSearch
          action="/admin/tournois"
          q={q}
          conserver={{ statut, anomalie }}
          placeholder="Nom du tournoi"
        />
        <Segmented activeKey={statut ?? "all"}>
          <Link href={href()} className="t-tab" role="tab" aria-selected={!statut}>
            Tous
          </Link>
          {TOURNAMENT_STATUSES.map((s) => (
            <Link key={s} href={href(s)} className="t-tab" role="tab" aria-selected={statut === s}>
              {TOURNAMENT_STATUS_LABELS[s]}
            </Link>
          ))}
        </Segmented>
      </div>

      <p className="mb-3 text-xs text-[var(--text-muted)]">
        {tournaments.length} tournoi{tournaments.length > 1 ? "s" : ""}
      </p>

      {tournaments.length === 0 ? (
        <EmptyLine>Aucun tournoi pour cette recherche.</EmptyLine>
      ) : (
        <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-lg border border-[var(--border)]">
          {tournaments.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 p-3">
              <span className="text-white">
                {t.name}
                <span className="dot-sep">·</span>
                <span className="text-[var(--text-muted)]">
                  {TOURNAMENT_STATUS_LABELS[t.status as TournamentStatus]}
                </span>
              </span>
              {/* Pas de lien « Matchs » : `gestion/matchs/` ne contient que
                  `[matchId]`, il n'y a pas de page d'index et le lien tomberait
                  en 404. Les matchs se gèrent depuis `gestion/competition`. */}
              <span className="flex shrink-0 gap-3 text-xs">
                <Link href={`/tournois/${t.id}/gestion`} className="text-[var(--accent)]">
                  Éditer
                </Link>
                <Link
                  href={`/tournois/${t.id}/gestion/inscrits`}
                  className="text-[var(--accent-2)]"
                >
                  Inscrits
                </Link>
                <Link
                  href={`/tournois/${t.id}/gestion/managers`}
                  className="text-[var(--accent-2)]"
                >
                  Managers
                </Link>
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
