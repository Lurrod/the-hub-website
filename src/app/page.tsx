import type { Metadata } from "next";
import { auth, signIn } from "@/lib/auth";
import { getPlayerByUserId } from "@/lib/data/players";
import LandingHero from "@/components/landing-hero";
import LandingShowcase from "@/components/landing-showcase";
import LandingClosing from "@/components/landing-closing";
import LandingFeed from "@/components/landing-feed";
import { pageMetadata } from "@/lib/metadata";
import JsonLdScript from "@/components/json-ld";
import { siteJsonLd } from "@/lib/structured-data";

// Titre absolu : « The Hub » seul ne posait aucun mot-clé sur la requête la
// plus disputée, et le gabarit « %s · The Hub » doublerait la marque.
// « VRC » y figure car c'est sous « the hub vrc » qu'on nous cherche — et sans
// cette chaîne quelque part, Google n'associe le sigle qu'à VRChat.
export const metadata: Metadata = {
  ...pageMetadata({ path: "/" }),
  title: { absolute: "The Hub VRC — Tournois et stats du Tier 3 Valorant francophone" },
};

/**
 * Temporaire : l'accueil se limite au hero tant qu'aucune équipe n'est inscrite
 * et qu'aucun tournoi n'est lancé - les sections tournois / résultats / joueurs
 * seraient vides ou trompeuses. Repasser à `true` pour les réafficher.
 */
const SHOW_FEED: boolean = false;

export default async function HomePage() {
  const session = await auth();
  const isLoggedIn = !!session?.user;
  const player = session?.user ? await getPlayerByUserId(session.user.id) : null;
  const profileHref = player ? `/joueurs/${player.id}` : "/profil";

  async function signInDiscord() {
    "use server";
    await signIn("discord");
  }

  return (
    <main>
      <JsonLdScript data={siteJsonLd()} />
      <LandingHero isLoggedIn={isLoggedIn} primaryHref={profileHref} signInAction={signInDiscord} />
      <LandingShowcase />
      <LandingClosing
        isLoggedIn={isLoggedIn}
        primaryHref={profileHref}
        signInAction={signInDiscord}
      />
      {SHOW_FEED && <LandingFeed isLoggedIn={isLoggedIn} />}
    </main>
  );
}
