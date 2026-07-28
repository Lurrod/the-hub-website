import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-auth";
import { isAdmin } from "@/lib/permissions";
import { listPlayers } from "@/lib/data/players";
import { createPlayerAction } from "@/app/admin/actions/players";
import PlayerForm from "@/components/player-form";

export const metadata = { title: "Admin · Joueurs" };

export default async function AdminPlayersPage() {
  const user = await getSessionUser();
  if (!isAdmin(user)) redirect("/");
  const players = await listPlayers();
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-white">Admin<span className="dot-sep">·</span>Joueurs</h1>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold text-white">Nouveau joueur</h2>
        <PlayerForm action={createPlayerAction} submitLabel="Créer" />
      </section>

      <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
        {players.map((p) => (
          <li key={p.id} className="flex items-center justify-between p-3">
            <span className="text-white">{p.pseudo}</span>
            <Link href={`/admin/joueurs/${p.id}`} className="text-sm text-[var(--accent)]">
              Éditer
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
