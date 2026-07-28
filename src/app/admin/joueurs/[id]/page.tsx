import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-auth";
import { isAdmin } from "@/lib/permissions";
import { getPlayer } from "@/lib/data/players";
import PlayerForm from "@/components/player-form";
import ConfirmDeleteButton from "@/components/confirm-delete-button";
import { updatePlayerAction, deletePlayerAction } from "@/app/admin/actions/players";

import { playerTitle } from "@/lib/data/titles";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const name = await playerTitle(id);
  return { title: name ? `Admin · ${name}` : "Admin · Joueur" };
}

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
          nationality: player.nationality ?? undefined,
          riotId: player.riotName ? `${player.riotName}#${player.riotTag}` : undefined,
          socials: (player.socials ?? {}) as { twitter?: string; twitch?: string },
        }}
      />
      <div className="mt-8">
        <ConfirmDeleteButton
          action={deleteWithId}
          label="Supprimer le joueur"
          title="Supprimer le joueur ?"
          message={`Le joueur « ${player.pseudo} » sera supprimé définitivement. Cette action est irréversible.`}
        />
      </div>
    </main>
  );
}
