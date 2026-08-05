"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-auth";
import {
  claimPlayerFiche,
  getPlayerByUserId,
  setPlayerRiotAccount,
  setPlayerLft,
  updatePlayer,
} from "@/lib/data/players";
import { playerInputSchema } from "@/lib/validation/player";
import { flashCodeFromError } from "@/lib/form-errors";
import { storePlayerPhotoFromForm } from "@/lib/player-photo";
import { resolveRiotAccountForClaim, riotFlashCode } from "@/lib/riot-account";
import { logger, describeError } from "@/lib/logger";
import { allow } from "@/lib/rate-limit";

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
  if (!allow(`riot:${player.id}`)) redirect("/onboarding?error=ratelimited");

  let resolved: Awaited<ReturnType<typeof resolveRiotAccountForClaim>>;
  try {
    resolved = await resolveRiotAccountForClaim(input, player.id);
  } catch (e) {
    redirect(`/onboarding?error=${riotFlashCode(e)}`);
  }

  // Une fiche d'archive porte déjà ce Riot ID : elle revient à son propriétaire
  // avec son historique, plutôt que de le bloquer sur « Riot ID déjà utilisé ».
  const { account, claimableId } = resolved;
  if (claimableId) {
    try {
      await claimPlayerFiche(claimableId, player.id);
    } catch (e) {
      logger.error("player.claim_failed", {
        claimedId: claimableId,
        temporaryId: player.id,
        ...describeError(e),
      });
      redirect("/onboarding?error=claimfailed");
    }
  }
  await setPlayerRiotAccount(claimableId ?? player.id, account);

  const store = await cookies();
  store.set("onboarded", "1", {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    // Même réglage que `/api/onboarded` : sans `httpOnly`, un simple
    // `document.cookie = "onboarded=1"` suffisait à franchir le gate — et donc
    // à sauter la liaison obligatoire du Riot ID.
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  redirect(`/?ok=${claimableId ? "fiche-claimed" : "riot-saved"}`);
}
