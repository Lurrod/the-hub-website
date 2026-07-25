import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-auth";
import { isAdmin } from "@/lib/permissions";
import { listTournaments } from "@/lib/data/tournaments";
import { TOURNAMENT_STATUS_LABELS, type TournamentStatus } from "@/lib/constants";

export default async function AdminTournamentsPage() {
  const user = await getSessionUser();
  if (!isAdmin(user)) redirect("/");
  const tournaments = await listTournaments();
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Admin · Tournois</h1>
        <Link
          href="/admin/tournois/nouvelle"
          className="rounded bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white"
        >
          Nouveau tournoi
        </Link>
      </div>
      <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
        {tournaments.map((t) => (
          <li key={t.id} className="flex items-center justify-between p-3">
            <span className="text-white">
              {t.name}{" "}
              <span className="text-[var(--text-muted)]">
                · {TOURNAMENT_STATUS_LABELS[t.status as TournamentStatus]}
              </span>
            </span>
            <span className="flex gap-3 text-sm">
              <Link href={`/admin/tournois/${t.id}`} className="text-[var(--accent)]">
                Éditer
              </Link>
              <Link href={`/admin/tournois/${t.id}/inscrits`} className="text-[var(--accent-2)]">
                Inscrits
              </Link>
              <Link href={`/admin/tournois/${t.id}/managers`} className="text-[var(--accent-2)]">
                Managers
              </Link>
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
