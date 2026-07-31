"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-auth";
import {
  getPlayerByUserId,
  setPlayerRiotAccount,
  setPlayerLft,
  updatePlayer,
} from "@/lib/data/players";
import { playerInputSchema } from "@/lib/validation/player";
import { flashCodeFromError } from "@/lib/form-errors";
import { storePlayerPhotoFromForm } from "@/lib/player-photo";
import { resolveRiotAccount, riotFlashCode } from "@/lib/riot-account";

/**
 * Inscription : profil complet + Riot ID obligatoire, en un seul formulaire.
 * On enregistre le profil AVANT l'appel à Riot : si la vérification échoue,
 * l'utilisateur retrouve ses saisies pré-remplies et n'a que son Riot ID à
 * corriger.
 */
export async function submitOnboarding(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/api/auth/signin");
  const player = await getPlayerByUserId(user.id);
  if (!player) redirect("/api/auth/signin");

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
  if (!parsed.success) redirect(`/onboarding?error=${flashCodeFromError(parsed.error)}`);

  await updatePlayer(player.id, parsed.data);
  await storePlayerPhotoFromForm(formData, player.id);

  const wantsLft = formData.get("lft") === "1";
  await setPlayerLft(player.id, { lft: wantsLft, lftSince: wantsLft ? new Date() : null });

  const input = String(formData.get("riotId") ?? "").trim();
  if (!input) redirect("/onboarding?error=riotformat");
  try {
    const account = await resolveRiotAccount(input, { excludePlayerId: player.id });
    await setPlayerRiotAccount(player.id, account);
  } catch (e) {
    redirect(`/onboarding?error=${riotFlashCode(e)}`);
  }

  const store = await cookies();
  store.set("onboarded", "1", {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect("/?ok=riot-saved");
}
