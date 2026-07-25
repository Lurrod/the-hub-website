"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/server-auth";
import { playerInputSchema } from "@/lib/validation/player";
import {
  getPlayerByUserId,
  updatePlayer,
  getActiveMembership,
  endMembership,
} from "@/lib/data/players";
import { storePlayerPhotoFromForm } from "@/lib/player-photo";

export async function updateMyProfileAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  const player = await getPlayerByUserId(user.id);
  if (!player) throw new Error("NO_PLAYER");

  const data = playerInputSchema.parse({
    pseudo: formData.get("pseudo"),
    realName: formData.get("realName") || undefined,
    nationality: formData.get("nationality") || undefined,
    socials: {
      twitter: formData.get("twitter") || undefined,
      twitch: formData.get("twitch") || undefined,
    },
  });

  await updatePlayer(player.id, data);
  await storePlayerPhotoFromForm(formData, player.id);
  revalidatePath("/profil");
  revalidatePath(`/joueurs/${player.id}`);
}

export async function leaveMyTeamAction() {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  const player = await getPlayerByUserId(user.id);
  if (!player) throw new Error("NO_PLAYER");
  const active = await getActiveMembership(player.id);
  if (active) await endMembership(active.id, new Date());
  revalidatePath("/profil");
}
