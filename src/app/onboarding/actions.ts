"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-auth";
import {
  claimPlayerFiche,
  finishOnboarding,
  getPlayerByUserId,
  setPlayerAccountType,
  setPlayerRiotAccount,
  setPlayerLft,
  updatePlayer,
} from "@/lib/data/players";
import { parseAccountType, requiresRiotId } from "@/lib/account-types";
import { playerInputSchema } from "@/lib/validation/player";
import { flashCodeFromError } from "@/lib/form-errors";
import { storePlayerPhotoFromForm } from "@/lib/player-photo";
import { resolveRiotAccountForClaim, riotFlashCode } from "@/lib/riot-account";
import { logger, describeError } from "@/lib/logger";
import { allow } from "@/lib/rate-limit";

/**
 * Inscription : type de compte, profil et Riot ID, en un seul formulaire.
 *
 * Le Riot ID n'est exigé que d'un joueur — lui seul a des matchs à relier.
 * Un coach ou un manager peut le laisser vide et terminer quand même.
 *
 * On enregistre le profil AVANT l'appel à Riot : si la vérification échoue,
 * l'utilisateur retrouve ses saisies pré-remplies et n'a que son Riot ID à
 * corriger.
 */
export async function submitOnboarding(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/api/auth/signin");
  const player = await getPlayerByUserId(user.id);
  if (!player) redirect("/api/auth/signin");

  // Le type est lu avant tout le reste : c'est lui qui dit ce qui est exigé.
  const accountType = parseAccountType(formData.get("accountType"));

  const parsed = playerInputSchema.safeParse({
    pseudo: formData.get("pseudo"),
    nationality: formData.get("nationality") || undefined,
    // Le champ n'est pas rendu hors du type joueur : `null` efface donc un
    // rôle choisi avant un changement de type, au lieu de le laisser traîner.
    valorantRole: formData.get("valorantRole") || null,
    birthdate: formData.get("birthdate") || "",
    socials: {
      twitter: formData.get("twitter") || undefined,
      twitch: formData.get("twitch") || undefined,
    },
  });
  if (!parsed.success) redirect(`/onboarding?error=${flashCodeFromError(parsed.error)}`);

  await updatePlayer(player.id, parsed.data);
  await setPlayerAccountType(player.id, accountType);
  await storePlayerPhotoFromForm(formData, player.id);

  const wantsLft = formData.get("lft") === "1";
  await setPlayerLft(player.id, { lft: wantsLft, lftSince: wantsLft ? new Date() : null });

  const input = String(formData.get("riotId") ?? "").trim();

  // Un coach ou un manager n'a pas forcément de compte de jeu : sans Riot ID,
  // son inscription se termine ici. C'est `onboardedAt` qui la marque, le
  // `puuid` ne pouvant plus jouer ce rôle.
  if (!input) {
    if (requiresRiotId(accountType)) redirect("/onboarding?error=riotformat");
    await finishOnboarding(player.id);
    await setOnboardedCookie();
    redirect("/?ok=onboarding-done");
  }

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
  await finishOnboarding(claimableId ?? player.id);

  await setOnboardedCookie();
  redirect(`/?ok=${claimableId ? "fiche-claimed" : "riot-saved"}`);
}

/**
 * Referme le gate d'onboarding pour la session en cours.
 *
 * `httpOnly` : sans lui, un simple `document.cookie = "onboarded=1"` suffisait
 * à franchir le gate — et donc à sauter l'inscription.
 */
async function setOnboardedCookie() {
  const store = await cookies();
  store.set("onboarded", "1", {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
}
