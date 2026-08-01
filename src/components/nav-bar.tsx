import Link from "next/link";
import { auth, signIn, signOut } from "@/lib/auth";
import { getPlayerByUserId } from "@/lib/data/players";
import NavLinks from "@/components/nav-links";
import UserMenu from "@/components/user-menu";
import { DiscordIcon, SearchIcon } from "@/components/icons";

export default async function NavBar() {
  const session = await auth();
  const isAdmin = session?.user?.globalRole === "ADMIN";
  const player = session?.user ? await getPlayerByUserId(session.user.id) : null;
  const pseudo = player?.pseudo ?? session?.user?.name ?? "Joueur";
  const photo = player?.photo ?? session?.user?.image ?? null;
  const profilHref = player ? `/joueurs/${player.id}` : "/profil";

  async function signOutAction() {
    "use server";
    await signOut();
  }
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border-strong)] bg-[var(--shell)]/90 backdrop-blur-md">
      {/* Sous 640px, la barre est trop étroite pour le champ de recherche et le
          libellé complet du bouton : le champ devient une icône vers /recherche
          et le bouton se réduit à l'icône Discord. */}
      <nav className="mx-auto flex h-[47px] max-w-6xl items-center gap-x-2 px-4 sm:gap-x-6">
        <Link href="/" aria-label="The Hub - accueil" className="flex shrink-0 items-center">
          {/* Rendu à 32 px de haut : le PNG source de 1125 px (98 Ko) était
              téléchargé sur chaque page. Le webp fait 3,7 Ko pour un rendu
              identique jusqu'en densité 4x. `width`/`height` déclarent le
              rapport intrinsèque et évitent tout décalage au chargement. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.webp"
            width={130}
            height={128}
            alt="The Hub"
            className="h-8 w-auto object-contain"
          />
        </Link>
        <NavLinks isAdmin={isAdmin} />

        <Link
          href="/recherche"
          aria-label="Rechercher"
          className="ml-auto grid h-8 w-8 shrink-0 place-items-center rounded border border-[var(--border)] bg-[var(--card)] text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-white sm:hidden"
        >
          <SearchIcon />
        </Link>

        <form
          action="/recherche"
          method="get"
          className="relative ml-auto hidden sm:block"
        >
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            name="q"
            placeholder="Rechercher…"
            aria-label="Rechercher"
            className="w-full rounded border border-[var(--border)] bg-[var(--card)] py-1.5 pl-8 pr-3 text-sm text-white transition-colors duration-[130ms] placeholder:text-[var(--text-muted)] hover:border-[var(--border-strong)] focus:border-[var(--accent)] focus:outline-none sm:w-52"
          />
        </form>
        {session?.user ? (
          <UserMenu
            pseudo={pseudo}
            photo={photo}
            profilHref={profilHref}
            signOutAction={signOutAction}
          />
        ) : (
          <form
            action={async () => {
              "use server";
              await signIn("discord");
            }}
          >
            <button
              aria-label="Connexion Discord"
              className="flex shrink-0 items-center gap-2 rounded bg-[var(--accent)] px-2.5 py-1.5 text-sm font-medium text-white transition-colors duration-[130ms] hover:bg-[var(--accent-hover)] sm:px-3"
            >
              <DiscordIcon className="h-4 w-4 sm:hidden" />
              <span className="hidden sm:inline">Connexion Discord</span>
            </button>
          </form>
        )}
      </nav>
    </header>
  );
}
