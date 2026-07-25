"use server";

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-auth";
import { getTeamByInviteToken } from "@/lib/data/teams";
import { getPlayerByUserId, getActiveMembership, addPlayerToTeam } from "@/lib/data/players";
import { isInviteValid } from "@/lib/invite";

export async function joinTeamViaInviteAction(token: string) {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHENTICATED");

  const team = await getTeamByInviteToken(token);
  if (!isInviteValid(team, new Date())) throw new Error("INVALID_INVITE");

  const player = await getPlayerByUserId(user.id);
  if (!player) throw new Error("NO_PLAYER");

  const active = await getActiveMembership(player.id);
  if (active) {
    // Déjà dans cette équipe → on renvoie simplement vers la page équipe.
    if (active.teamId === team!.id) redirect(`/equipes/${team!.id}`);
    // Déjà dans une autre équipe → refus (l'UI doit avoir bloqué en amont).
    throw new Error("ALREADY_IN_TEAM");
  }

  await addPlayerToTeam(team!.id, player.id, "JOUEUR");
  redirect(`/equipes/${team!.id}`);
}
