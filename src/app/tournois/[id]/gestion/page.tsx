import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser, getTournamentManagerIds } from "@/lib/server-auth";
import { canManageTournament } from "@/lib/permissions";
import { getTournament } from "@/lib/data/tournaments";
import TournamentForm from "@/components/tournament-form";
import ConfirmDeleteButton from "@/components/confirm-delete-button";
import { updateTournamentAction, deleteTournamentAction } from "@/app/admin/actions/tournaments";

import { tournamentTitle } from "@/lib/data/titles";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const name = await tournamentTitle(id);
  return { title: name ? `Gestion · ${name}` : "Gestion du tournoi" };
}

function toDateInput(d: Date | null): string {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}

const TAB_LINK =
  "rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-medium text-white transition-colors duration-[130ms] hover:border-[var(--accent)] hover:bg-[var(--card-hover)] hover:text-[var(--accent)]";

export default async function TournamentGestionPage({
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

  const updateWithId = updateTournamentAction.bind(null, id);
  const deleteWithId = deleteTournamentAction.bind(null, id);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">
          Gérer<span className="dot-sep">·</span>
          {tournament.name}
        </h1>
        <Link
          href={`/tournois/${id}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm text-white transition-colors duration-[130ms] hover:border-[var(--accent)] hover:bg-[var(--card-hover)] hover:text-[var(--accent)]"
        >
          Voir la page publique
        </Link>
      </div>

      <nav className="mb-8 flex flex-wrap gap-3">
        <Link href={`/tournois/${id}/gestion/inscrits`} className={TAB_LINK}>
          Inscrits
        </Link>
        <Link href={`/tournois/${id}/gestion/competition`} className={TAB_LINK}>
          Poules &amp; matchs
        </Link>
        <Link href={`/tournois/${id}/gestion/managers`} className={TAB_LINK}>
          Managers
        </Link>
      </nav>

      <h2 className="mb-3 text-lg font-semibold text-white">Identité</h2>
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
          maxTeams: tournament.maxTeams ?? undefined,
          groupSize: tournament.groupSize ?? undefined,
          bestOf: tournament.bestOf ?? undefined,
          seeding: tournament.seeding ?? undefined,
          socials: (tournament.socials ?? {}) as Record<string, string | undefined>,
        }}
      />

      <section className="mt-10 rounded-lg border border-[var(--destructive)] p-4">
        <h2 className="mb-2 text-lg font-semibold text-[var(--destructive)]">Zone danger</h2>
        <p className="mb-3 text-sm text-[var(--text-muted)]">
          La suppression du tournoi est définitive (poules, matchs et inscriptions liés).
        </p>
        <ConfirmDeleteButton
          action={deleteWithId}
          label="Supprimer le tournoi"
          title="Supprimer le tournoi ?"
          message={`Le tournoi « ${tournament.name} » sera supprimé définitivement. Poules, matchs et inscriptions liés seront perdus.`}
        />
      </section>
    </main>
  );
}
