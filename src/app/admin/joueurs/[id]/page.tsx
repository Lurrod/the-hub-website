import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-auth";
import { isAdmin } from "@/lib/permissions";
import { getPlayer } from "@/lib/data/players";
import PlayerForm from "@/components/player-form";
import { updatePlayerAction, deletePlayerAction } from "@/app/admin/actions/players";

export default async function EditPlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!isAdmin(user)) redirect("/");
  const player = await getPlayer(id);
  if (!player) notFound();

  const updateWithId = updatePlayerAction.bind(null, id);
  const deleteWithId = deletePlayerAction.bind(null, id);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-white">Éditer {player.pseudo}</h1>
      <PlayerForm
        action={updateWithId}
        submitLabel="Enregistrer"
        values={{
          pseudo: player.pseudo,
          realName: player.realName ?? undefined,
          nationality: player.nationality ?? undefined,
          socials: (player.socials ?? {}) as { twitter?: string; twitch?: string },
        }}
      />
      <form action={deleteWithId} className="mt-8">
        <button className="rounded border border-[var(--accent)] px-3 py-1.5 text-sm text-[var(--accent)]">
          Supprimer le joueur
        </button>
      </form>
    </main>
  );
}
