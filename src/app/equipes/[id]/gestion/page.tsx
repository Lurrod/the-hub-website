import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser, getTeamManagerIds } from "@/lib/server-auth";
import { canManageTeam } from "@/lib/permissions";
import { getTeam } from "@/lib/data/teams";
import TeamForm from "@/components/team-form";
import { updateTeamAction, deleteTeamAction } from "@/app/admin/actions/teams";

export default async function TeamGestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const team = await getTeam(id);
  if (!team) notFound();

  const user = await getSessionUser();
  const managerIds = await getTeamManagerIds(id);
  if (!canManageTeam(user, managerIds)) redirect("/");

  const updateWithId = updateTeamAction.bind(null, id);
  const deleteWithId = deleteTeamAction.bind(null, id);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Gérer · {team.name}</h1>
        <Link href={`/equipes/${id}`} className="text-sm text-[var(--text-muted)]">
          ← Voir la page publique
        </Link>
      </div>

      <nav className="mb-8 flex flex-wrap gap-4 text-sm text-[var(--accent-2)]">
        <Link href={`/equipes/${id}/gestion/roster`}>Roster →</Link>
        <Link href={`/equipes/${id}/gestion/invitation`}>Lien d&apos;invitation →</Link>
        <Link href={`/equipes/${id}/gestion/managers`}>Managers →</Link>
      </nav>

      <h2 className="mb-3 text-lg font-semibold text-white">Identité</h2>
      <TeamForm
        action={updateWithId}
        submitLabel="Enregistrer"
        values={{
          name: team.name,
          tag: team.tag,
          region: team.region,
          description: team.description ?? undefined,
          status: team.status,
          socials: (team.socials ?? {}) as { twitter?: string; twitch?: string; website?: string },
        }}
      />

      <section className="mt-10 rounded-lg border border-[var(--destructive)] p-4">
        <h2 className="mb-2 text-lg font-semibold text-[var(--destructive)]">Zone danger</h2>
        <p className="mb-3 text-sm text-[var(--text-muted)]">
          La suppression de l&apos;équipe est définitive (roster, historiques et participations liées).
        </p>
        <form action={deleteWithId}>
          <button className="rounded border border-[var(--accent)] px-3 py-1.5 text-sm text-[var(--accent)]">
            Supprimer l&apos;équipe
          </button>
        </form>
      </section>
    </main>
  );
}
