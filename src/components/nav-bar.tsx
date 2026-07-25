import Link from "next/link";
import { auth, signIn, signOut } from "@/lib/auth";
import NavLinks from "@/components/nav-links";

export default async function NavBar() {
  const session = await auth();
  const isAdmin = session?.user?.globalRole === "ADMIN";
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border-strong)] bg-[var(--bg)]/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="wordmark flex items-center gap-2 text-base text-white">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--accent)] shadow-[0_0_10px_var(--accent-glow)]" />
          The Hub
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
        {session?.user && (
          <Link
            href="/profil"
            aria-label="Profil"
            title="Profil"
            className="grid h-9 w-9 shrink-0 place-items-center rounded border border-[var(--border)] bg-[var(--card)] text-white transition-colors duration-[130ms] hover:border-[var(--accent)] hover:bg-[var(--card-hover)] hover:text-[var(--accent)]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </Link>
        )}
        <div>
          {session?.user ? (
            <form
              action={async () => {
                "use server";
                await signOut();
              }}
            >
              <button className="rounded bg-[var(--card)] px-3 py-1.5 text-sm text-white transition-colors duration-[130ms] hover:bg-[var(--card-hover)]">
                Déconnexion ({session.user.name})
              </button>
            </form>
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
        </div>
      </nav>
    </header>
  );
}
