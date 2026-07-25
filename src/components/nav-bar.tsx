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
    <header className="sticky top-0 z-30 border-b border-[var(--border-strong)] bg-[var(--bg)]/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" aria-label="The Hub — accueil" className="flex shrink-0 items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="The Hub" className="h-8 w-auto object-contain" />
        </Link>
        <NavLinks isAdmin={isAdmin} />
        <form
          action="/recherche"
          method="get"
          className="order-last w-full sm:order-none sm:ml-auto sm:w-auto"
        >
          <input
            name="q"
            placeholder="Rechercher…"
            aria-label="Rechercher"
            className="w-full rounded border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm text-white transition-colors duration-[130ms] placeholder:text-[var(--text-muted)] hover:border-[var(--border-strong)] focus:border-[var(--accent)] focus:outline-none sm:w-52"
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
