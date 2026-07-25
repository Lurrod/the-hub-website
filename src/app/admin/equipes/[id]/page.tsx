import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser, getTeamManagerIds } from "@/lib/server-auth";
import { canManageTeam } from "@/lib/permissions";
import { getTeam } from "@/lib/data/teams";
import TeamForm from "@/components/team-form";
import { updateTeamAction, deleteTeamAction } from "@/app/admin/actions/teams";

export default async function EditTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const team = await getTeam(id);
  if (!team) notFound();

  const user = await getSessionUser();
  const managerIds = await getTeamManagerIds(id);
  if (!canManageTeam(user, managerIds)) redirect("/");

  const isAdminUser = user?.globalRole === "ADMIN";
  const updateWithId = updateTeamAction.bind(null, id);
  const deleteWithId = deleteTeamAction.bind(null, id);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-white">Éditer {team.name}</h1>
      <Link href={`/admin/equipes/${id}/roster`} className="mb-4 inline-block text-sm text-[var(--accent-2)]">
        Gérer le roster →
      </Link>
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
      {isAdminUser && (
        <form action={deleteWithId} className="mt-8">
          <button className="rounded border border-[var(--accent)] px-3 py-1.5 text-sm text-[var(--accent)]">
            Supprimer l'équipe
          </button>
        </form>
      )}
    </main>
  );
}
