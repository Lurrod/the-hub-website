"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getTeamByInviteToken } from "@/lib/data/teams";
import { ensurePlayerForUser, joinTeamIfFree } from "@/lib/data/players";
import { isInviteValid, isInviteTokenFormat } from "@/lib/invite";

export async function joinTeamViaInviteAction(token: string) {
  if (!isInviteTokenFormat(token)) throw new Error("INVALID_INVITE");

  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHENTICATED");

  const team = await getTeamByInviteToken(token);
  if (!isInviteValid(team, new Date())) throw new Error("INVALID_INVITE");

  // La fiche joueur n'est créée qu'au moment du join (pas à la simple vue du lien).
  const player = await ensurePlayerForUser(session.user.id, {
    pseudo: session.user.name,
    photo: session.user.image,
  });

  // Join atomique : protège l'invariant « une seule équipe active ».
  const result = await joinTeamIfFree(team.id, player.id, "JOUEUR");
  if (!result.ok) {
    // Déjà dans cette équipe → simple redirection ; autre équipe → refus.
    if (result.activeTeamId === team.id) redirect(`/equipes/${team.id}`);
    throw new Error("ALREADY_IN_TEAM");
  }

  revalidatePath(`/equipes/${team.id}`);
  redirect(`/equipes/${team.id}`);
}
