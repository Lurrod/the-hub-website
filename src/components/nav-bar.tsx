import { Suspense } from "react";
import Link from "next/link";
import NavLinks from "@/components/nav-links";
import {
  NavSessionLinks,
  NavSessionUser,
  NavSessionUserFallback,
} from "@/components/nav-session";
import { SearchIcon } from "@/components/icons";

/**
 * Barre de navigation.
 *
 * Volontairement synchrone : les deux morceaux qui dépendent de la session
 * sont suspendus. Auparavant la barre entière était `async` et attendait la
 * session PUIS la fiche joueur — deux allers-retours en base avant le premier
 * octet de HTML, sur toutes les pages, y compris publiques. Le squelette part
 * maintenant tout de suite et ces morceaux le rejoignent.
 */
export default function NavBar() {
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
        {/* Repli sans le lien Admin : il ne concerne qu'une poignée de comptes,
            et l'attendre retarderait l'affichage de tous les autres. */}
        <Suspense fallback={<NavLinks isAdmin={false} />}>
          <NavSessionLinks />
        </Suspense>

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
        <Suspense fallback={<NavSessionUserFallback />}>
          <NavSessionUser />
        </Suspense>
      </nav>
    </header>
  );
}
