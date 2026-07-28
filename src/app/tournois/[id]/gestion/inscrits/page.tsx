import { notFound, redirect } from "next/navigation";
import { getSessionUser, getTournamentManagerIds } from "@/lib/server-auth";
import { canManageTournament } from "@/lib/permissions";
import { getTournament } from "@/lib/data/tournaments";
import { listTeams } from "@/lib/data/teams";
import { addParticipantAction, removeParticipantAction } from "@/app/admin/actions/tournaments";

import { tournamentTitle } from "@/lib/data/titles";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const name = await tournamentTitle(id);
  return { title: name ? `Inscrits · ${name}` : "Inscrits" };
}

export default async function TournamentParticipantsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tournament = await getTournament(id);
  if (!tournament) notFound();

  const user = await getSessionUser();
  const managerIds = await getTournamentManagerIds(id);
  if (!canManageTournament(user, managerIds)) redirect("/");

  const registered = new Set(tournament.participants.map((p) => p.teamId));
  const teams = (await listTeams()).filter((t) => !registered.has(t.id));

  const addWithId = addParticipantAction.bind(null, id);
  const input =
    "rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-white";

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-white">Inscrits<span className="dot-sep">·</span>{tournament.name}</h1>

      <ul className="mb-6 divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
        {tournament.participants.length === 0 && (
          <li className="p-3 text-[var(--text-muted)]">Aucune équipe inscrite.</li>
        )}
        {tournament.participants.map((p) => {
          const removeWith = removeParticipantAction.bind(null, id, p.teamId);
          return (
            <li key={p.id} className="flex items-center justify-between p-3">
              <span className="text-white">
                {p.team.name}
                {p.seed != null && (
                  <>
                    <span className="dot-sep">·</span>
                    Seed {p.seed}
                  </>
                )}
              </span>
              <form action={removeWith}>
                <button className="text-sm text-[var(--accent)]">Retirer</button>
              </form>
            </li>
          );
        })}
      </ul>

      {teams.length === 0 && tournament.participants.length > 0 && (
        <p className="mb-3 text-sm text-[var(--text-muted)]">
          Toutes les équipes disponibles sont déjà inscrites.
        </p>
      )}

      <form action={addWithId} className="flex gap-2">
        <select name="teamId" required className={`${input} flex-1`}>
          <option value="">- Choisir une équipe -</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <input name="seed" type="number" min="1" placeholder="Seed" className={`${input} w-24`} />
        <button className="rounded bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white">
          Inscrire
        </button>
      </form>
    </main>
  );
}
