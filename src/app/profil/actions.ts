"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-auth";
import { playerInputSchema } from "@/lib/validation/player";
import { flashCodeFromError } from "@/lib/form-errors";
import {
  getPlayerByUserId,
  updatePlayer,
  getActiveMembership,
  endMembership,
  setPlayerRiotAccount,
  setPlayerLft,
} from "@/lib/data/players";
import { nextLftState } from "@/lib/lft";
import { resolveRiotAccount, riotFlashCode } from "@/lib/riot-account";
import { storePlayerPhotoFromForm } from "@/lib/player-photo";

/**
 * Fiche joueur du visiteur, ou redirection.
 *
 * Une session expirée entre l'affichage du formulaire et son envoi est un cas
 * ordinaire : il vaut mieux renvoyer vers la connexion que lever une erreur
 * technique qui n'affiche qu'un « Quelque chose s'est mal passé ». Un compte
 * sans fiche n'a pas terminé son inscription : direction l'onboarding.
 */
async function requireOwnPlayer() {
  const user = await getSessionUser();
  if (!user) redirect("/api/auth/signin");
  const player = await getPlayerByUserId(user.id);
  if (!player) redirect("/onboarding");
  return player;
}

export async function updateMyProfileAction(formData: FormData) {
  const player = await requireOwnPlayer();

  const parsed = playerInputSchema.safeParse({
    pseudo: formData.get("pseudo"),
    nationality: formData.get("nationality") || undefined,
    valorantRole: formData.get("valorantRole") || null,
    birthdate: formData.get("birthdate") || "",
    socials: {
      twitter: formData.get("twitter") || undefined,
      twitch: formData.get("twitch") || undefined,
    },
  });
  if (!parsed.success) redirect(`/profil?error=${flashCodeFromError(parsed.error)}`);
  const data = parsed.data;

  await updatePlayer(player.id, data);
  await storePlayerPhotoFromForm(formData, player.id);
  revalidatePath("/profil");
  revalidatePath(`/joueurs/${player.id}`);
  redirect("/profil?ok=profile-saved");
}

export async function updateMyRiotIdAction(formData: FormData) {
  const player = await requireOwnPlayer();

  const input = String(formData.get("riotId") ?? "").trim();
  if (!input) redirect("/profil?error=riotformat");
  try {
    const account = await resolveRiotAccount(input, { excludePlayerId: player.id });
    await setPlayerRiotAccount(player.id, account);
  } catch (e) {
    redirect(`/profil?error=${riotFlashCode(e)}`);
  }
  revalidatePath("/profil");
  revalidatePath(`/joueurs/${player.id}`);
  redirect("/profil?ok=riot-saved");
}

export async function toggleMyLftAction() {
  const player = await requireOwnPlayer();

  const state = nextLftState(player.lft);
  await setPlayerLft(player.id, state);
  revalidatePath("/profil");
  revalidatePath("/lft");
  redirect(`/profil?ok=${state.lft ? "lft-on" : "lft-off"}`);
}

export async function leaveMyTeamAction() {
  const player = await requireOwnPlayer();
  const active = await getActiveMembership(player.id);
  if (active) await endMembership(active.id, new Date());
  revalidatePath("/profil");
  redirect("/profil?ok=left-team");
}
