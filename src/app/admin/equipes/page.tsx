import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-auth";
import { isAdmin } from "@/lib/permissions";
import { listTeams } from "@/lib/data/teams";

export const metadata = { title: "Admin · Équipes" };

export default async function AdminTeamsPage() {
  const user = await getSessionUser();
  if (!isAdmin(user)) redirect("/");
  const teams = await listTeams();
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Admin<span className="dot-sep">·</span>Équipes</h1>
        <Link href="/admin/equipes/nouvelle" className="rounded bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white">
          Nouvelle équipe
        </Link>
      </div>
      <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
        {teams.map((t) => (
          <li key={t.id} className="flex items-center justify-between p-3">
            <span className="text-white">
              {t.name} <span className="text-[var(--text-muted)]">[{t.tag}]</span>
            </span>
            <span className="flex gap-3 text-sm">
              <Link href={`/equipes/${t.id}/gestion`} className="text-[var(--accent)]">Éditer</Link>
              <Link href={`/equipes/${t.id}/gestion/managers`} className="text-[var(--accent-2)]">Managers</Link>
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
