import { notFound, redirect } from "next/navigation";
import { getSessionUser, getTeamManagerIds } from "@/lib/server-auth";
import { canManageTeam } from "@/lib/permissions";
import { getTeam } from "@/lib/data/teams";
import { addManagerAction, removeManagerAction } from "@/app/admin/actions/teams";

import { teamTitle } from "@/lib/data/titles";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const name = await teamTitle(id);
  return { title: name ? `Managers · ${name}` : "Managers" };
}

export default async function TeamManagersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  const managerIds = await getTeamManagerIds(id);
  if (!canManageTeam(user, managerIds)) redirect("/");
  const team = await getTeam(id);
  if (!team) notFound();

  const addWithId = addManagerAction.bind(null, id);
  const input = "rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-white";

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-white">Managers<span className="dot-sep">·</span>{team.name}</h1>

      <ul className="mb-6 divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
        {team.managers.length === 0 && (
          <li className="p-3 text-[var(--text-muted)]">Aucun manager.</li>
        )}
        {team.managers.map((m) => {
          const removeWith = removeManagerAction.bind(null, id, m.userId);
          return (
            <li key={m.id} className="flex items-center justify-between p-3">
              <span className="text-white">{m.user.name ?? m.user.discordId ?? m.userId}</span>
              <form action={removeWith}>
                <button className="text-sm text-[var(--accent)]">Retirer</button>
              </form>
            </li>
          );
        })}
      </ul>

      <form action={addWithId} className="flex gap-2">
        <input
          name="discordId"
          placeholder="ID Discord (ex. 123456789012345678)"
          required
          className={`${input} flex-1`}
        />
        <button className="rounded bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white">
          Ajouter
        </button>
      </form>
      <p className="mt-2 text-xs text-[var(--text-muted)]">
        L&apos;utilisateur doit s&apos;être déjà connecté au moins une fois (via Discord) pour exister en base.
        Utilise son ID Discord (Discord → Paramètres → Avancés → Mode développeur, puis clic droit sur le profil → « Copier l&apos;identifiant »).
      </p>
    </main>
  );
}
