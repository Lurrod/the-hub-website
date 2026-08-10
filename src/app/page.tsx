import { auth, signIn } from "@/lib/auth";
import { getPlayerByUserId } from "@/lib/data/players";
import LandingHero from "@/components/landing-hero";
import LandingFeed from "@/components/landing-feed";
import { pageMetadata } from "@/lib/metadata";
import JsonLdScript from "@/components/json-ld";
import { siteJsonLd } from "@/lib/structured-data";

export const metadata = pageMetadata({ path: "/" });

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
      <LandingHero
        isLoggedIn={isLoggedIn}
        primaryHref={profileHref}
        signInAction={signInDiscord}
      />
      {SHOW_FEED && <LandingFeed isLoggedIn={isLoggedIn} />}
    </main>
  );
}
