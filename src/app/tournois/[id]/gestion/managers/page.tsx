import { notFound, redirect } from "next/navigation";
import { getSessionUser, getTournamentManagerIds } from "@/lib/server-auth";
import { canManageTournament } from "@/lib/permissions";
import { getTournament } from "@/lib/data/tournaments";
import {
  addTournamentManagerAction,
  removeTournamentManagerAction,
} from "@/app/admin/actions/tournaments";

export default async function TournamentManagersPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const user = await getSessionUser();
  const managerIds = await getTournamentManagerIds(id);
  if (!canManageTournament(user, managerIds)) redirect("/");
  const tournament = await getTournament(id);
  if (!tournament) notFound();

  const addWithId = addTournamentManagerAction.bind(null, id);
  const input =
    "rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-white";

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-white">Managers · {tournament.name}</h1>

      <ul className="mb-6 divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
        {tournament.managers.length === 0 && (
          <li className="p-3 text-[var(--text-muted)]">Aucun manager.</li>
        )}
        {tournament.managers.map((m) => {
          const removeWith = removeTournamentManagerAction.bind(null, id, m.userId);
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

      {error && (
        <p className="mb-4 rounded border border-[var(--destructive)] bg-[var(--destructive-soft)] px-3 py-2 text-sm text-[var(--destructive)]">
          {error === "notfound"
            ? "Aucun utilisateur avec cet ID Discord. Il doit s'être connecté au moins une fois via Discord pour exister en base."
            : error === "lastmanager"
              ? "Impossible de retirer le dernier manager du tournoi."
              : "Renseigne l'ID Discord de l'utilisateur."}
        </p>
      )}

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
        Utilise son ID Discord (Discord → Paramètres → Avancés → Mode développeur, puis clic droit sur le profil → «&nbsp;Copier l&apos;identifiant&nbsp;»).
      </p>
    </main>
  );
}
