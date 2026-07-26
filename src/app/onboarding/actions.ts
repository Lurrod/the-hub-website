"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-auth";
import { getPlayerByUserId, setPlayerRiotAccount } from "@/lib/data/players";
import { resolveRiotAccount, riotFlashCode } from "@/lib/riot-account";

export async function submitOnboardingRiotId(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/api/auth/signin");
  const player = await getPlayerByUserId(user.id);
  if (!player) redirect("/api/auth/signin");

  const input = String(formData.get("riotId") ?? "");
  try {
    const account = await resolveRiotAccount(input, { excludePlayerId: player.id });
    await setPlayerRiotAccount(player.id, account);
  } catch (e) {
    redirect(`/onboarding?error=${riotFlashCode(e)}`);
  }

  const store = await cookies();
  store.set("onboarded", "1", { path: "/", httpOnly: false, sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  redirect("/?ok=riot-saved");
}
