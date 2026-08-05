"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getTeamByInviteToken } from "@/lib/data/teams";
import {
  ensurePlayerForUser,
  getPlayerByUserId,
  joinTeamIfFree,
  setPlayerRiotAccount,
} from "@/lib/data/players";
import { isInviteValid, isInviteTokenFormat } from "@/lib/invite";
import { resolveRiotAccount, riotFlashCode } from "@/lib/riot-account";
import { allow } from "@/lib/rate-limit";

export async function joinTeamViaInviteAction(token: string, formData: FormData) {
  // Un lien périmé ou un compte déconnecté entre l'affichage et l'envoi du
  // formulaire est un cas de figure ordinaire : il mérite un message lisible,
  // pas la page d'erreur générique.
  if (!isInviteTokenFormat(token)) redirect("/?error=invalidinvite");

  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin");

  const team = await getTeamByInviteToken(token);
  if (!isInviteValid(team, new Date())) redirect("/?error=invalidinvite");

  // La fiche joueur n'est créée qu'au moment du join (pas à la simple vue du lien).
  const player = await ensurePlayerForUser(session.user.id, {
    pseudo: session.user.name,
    photo: session.user.image,
  });

  // Re-confirmation du Riot ID : si la valeur soumise diffère de l'actuelle, on vérifie et met à jour.
  const current = await getPlayerByUserId(session.user.id);
  const submitted = String(formData.get("riotId") ?? "").trim();
  const currentRiotId = current?.riotName ? `${current.riotName}#${current.riotTag}` : "";
  if (submitted && submitted !== currentRiotId) {
    if (!allow(`riot:${player.id}`)) redirect(`/rejoindre/${token}?error=ratelimited`);
    try {
      const account = await resolveRiotAccount(submitted, { excludePlayerId: player.id });
      await setPlayerRiotAccount(player.id, account);
    } catch (e) {
      redirect(`/rejoindre/${token}?error=${riotFlashCode(e)}`);
    }
  }

  // Join atomique : protège l'invariant « une seule équipe active ».
  const result = await joinTeamIfFree(team.id, player.id, "JOUEUR");
  if (!result.ok) {
    // Déjà dans cette équipe → simple redirection ; autre équipe → refus.
    if (result.activeTeamId === team.id) redirect(`/equipes/${team.id}`);
    redirect("/profil?error=alreadyinteam");
  }

  revalidatePath(`/equipes/${team.id}`);
  redirect(`/equipes/${team.id}?ok=member-added`);
}
