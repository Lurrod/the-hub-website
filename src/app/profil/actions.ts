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
} from "@/lib/data/players";
import { resolveRiotAccount, riotFlashCode } from "@/lib/riot-account";
import { storePlayerPhotoFromForm } from "@/lib/player-photo";

export async function updateMyProfileAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  const player = await getPlayerByUserId(user.id);
  if (!player) throw new Error("NO_PLAYER");

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
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  const player = await getPlayerByUserId(user.id);
  if (!player) throw new Error("NO_PLAYER");

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

export async function leaveMyTeamAction() {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  const player = await getPlayerByUserId(user.id);
  if (!player) throw new Error("NO_PLAYER");
  const active = await getActiveMembership(player.id);
  if (active) await endMembership(active.id, new Date());
  revalidatePath("/profil");
  redirect("/profil?ok=left-team");
}
