import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser, getTournamentManagerIds } from "@/lib/server-auth";
import { canManageTournament } from "@/lib/permissions";
import { getTournament } from "@/lib/data/tournaments";
import TournamentForm from "@/components/tournament-form";
import { updateTournamentAction, deleteTournamentAction } from "@/app/admin/actions/tournaments";

function toDateInput(d: Date | null): string {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}

export default async function EditTournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournament = await getTournament(id);
  if (!tournament) notFound();

  const user = await getSessionUser();
  const managerIds = await getTournamentManagerIds(id);
  if (!canManageTournament(user, managerIds)) redirect("/");

  const isAdminUser = user?.globalRole === "ADMIN";
  const updateWithId = updateTournamentAction.bind(null, id);
  const deleteWithId = deleteTournamentAction.bind(null, id);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-white">Éditer {tournament.name}</h1>
      <nav className="mb-4 flex flex-wrap gap-4 text-sm text-[var(--accent-2)]">
        <Link href={`/admin/tournois/${id}/inscrits`}>Gérer les inscrits →</Link>
        <Link href={`/admin/tournois/${id}/competition`}>Poules &amp; matchs →</Link>
        <Link href={`/admin/tournois/${id}/managers`}>Managers →</Link>
      </nav>
      <TournamentForm
        action={updateWithId}
        submitLabel="Enregistrer"
        values={{
          name: tournament.name,
          region: tournament.region,
          format: tournament.format,
          status: tournament.status,
          startDate: toDateInput(tournament.startDate),
          endDate: toDateInput(tournament.endDate),
          prizePool: tournament.prizePool ?? undefined,
          organizer: tournament.organizer ?? undefined,
          description: tournament.description ?? undefined,
        }}
      />
      {isAdminUser && (
        <form action={deleteWithId} className="mt-8">
          <button className="rounded border border-[var(--accent)] px-3 py-1.5 text-sm text-[var(--accent)]">
            Supprimer le tournoi
          </button>
        </form>
      )}
    </main>
  );
}
