import { signIn, signOut } from "@/lib/auth";
import { getCachedOwnPlayer, getCachedSession } from "@/lib/session";
import NavLinks from "@/components/nav-links";
import UserMenu from "@/components/user-menu";
import { DiscordIcon } from "@/components/icons";

/**
 * Les deux morceaux de la barre qui dépendent de la session.
 *
 * Ils vivent à part pour pouvoir être suspendus : la barre bloquait sinon
 * l'envoi de TOUT le document sur deux requêtes en base (session + fiche
 * joueur), y compris sur les pages publiques où personne n'attend ces données.
 * Les deux appels sont dédupliqués par `cache`, il n'y a donc qu'un
 * aller-retour malgré les deux composants.
 */

const AUTH_BUTTON =
  "flex shrink-0 items-center gap-2 rounded bg-[var(--accent)] px-2.5 py-1.5 text-sm font-medium text-white transition-colors duration-[130ms] hover:bg-[var(--accent-hover)] sm:px-3";

export async function NavSessionLinks() {
  const session = await getCachedSession();
  return <NavLinks isAdmin={session?.user?.globalRole === "ADMIN"} />;
}

export async function NavSessionUser() {
  const [session, player] = await Promise.all([getCachedSession(), getCachedOwnPlayer()]);

  if (!session?.user) {
    return (
      <form
        action={async () => {
          "use server";
          await signIn("discord");
        }}
      >
        <button aria-label="Connexion Discord" className={AUTH_BUTTON}>
          <DiscordIcon className="h-4 w-4 sm:hidden" />
          <span className="hidden sm:inline">Connexion Discord</span>
        </button>
      </form>
    );
  }

  async function signOutAction() {
    "use server";
    await signOut();
  }

  return (
    <UserMenu
      pseudo={player?.pseudo ?? session.user.name ?? "Joueur"}
      photo={player?.photo ?? session.user.image ?? null}
      profilHref={player ? `/joueurs/${player.id}` : "/profil"}
      signOutAction={signOutAction}
    />
  );
}

/**
 * Réservation d'espace pendant le chargement : la barre ne doit pas sauter
 * quand le menu utilisateur arrive.
 */
export function NavSessionUserFallback() {
  return <div aria-hidden className="h-8 w-8 shrink-0 rounded-full bg-[var(--card)] sm:w-32" />;
}
