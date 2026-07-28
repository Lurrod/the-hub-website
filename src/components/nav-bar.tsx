import Link from "next/link";
import { auth, signIn, signOut } from "@/lib/auth";
import { getPlayerByUserId } from "@/lib/data/players";
import NavLinks from "@/components/nav-links";
import UserMenu from "@/components/user-menu";

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
      <nav className="mx-auto flex h-[47px] max-w-6xl items-center gap-x-6 px-4">
        <Link href="/" aria-label="The Hub - accueil" className="flex shrink-0 items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="The Hub" className="h-8 w-auto object-contain" />
        </Link>
        <NavLinks isAdmin={isAdmin} />
        <form
          action="/recherche"
          method="get"
          className="relative ml-auto"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
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
            <button className="rounded bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white transition-colors duration-[130ms] hover:bg-[var(--accent-hover)]">
              Connexion Discord
            </button>
          </form>
        )}
      </nav>
    </header>
  );
}
