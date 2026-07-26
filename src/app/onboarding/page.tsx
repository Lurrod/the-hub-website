import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-auth";
import { getPlayerByUserId } from "@/lib/data/players";
import RiotIdForm from "@/components/riot-id-form";
import { submitOnboardingRiotId } from "@/app/onboarding/actions";

export default async function OnboardingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/api/auth/signin");
  const player = await getPlayerByUserId(user.id);

  if (player?.puuid) {
    const store = await cookies();
    store.set("onboarded", "1", { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
    redirect("/");
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
        Bienvenue
      </h1>
      <p className="mb-6 mt-2 text-sm text-[var(--text-muted)]">
        Pour continuer, renseigne ton Riot ID Valorant. Il sert à relier tes matchs
        et tes statistiques. On vérifie qu'il existe auprès de Riot.
      </p>
      <RiotIdForm action={submitOnboardingRiotId} submitLabel="Valider mon Riot ID" />
    </main>
  );
}
