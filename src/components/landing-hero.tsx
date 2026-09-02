import Link from "next/link";

/**
 * Première section de la landing : plein écran, composition centrée, très peu
 * d'éléments. Tout le travail est dans l'air autour du texte et dans
 * l'atmosphère (nappes d'accent, grain, vignette) - pas dans des blocs empilés.
 */
export default function LandingHero({
  isLoggedIn,
  primaryHref,
  signInAction,
}: {
  isLoggedIn: boolean;
  primaryHref: string;
  signInAction: () => Promise<void>;
}) {
  return (
    // 48px = hauteur de la navbar (47) + son border-bottom (1) : sans le
    // border, la page dépasse d'un pixel et fait apparaître une barre de défilement.
    <section className="relative isolate flex min-h-[calc(100dvh-48px)] items-center justify-center overflow-hidden border-b border-[var(--border)] px-4 py-24">
      {/* Couches d'ambiance, purement décoratives */}
      <div className="h-bloom h-bloom-c" aria-hidden="true" />
      <div className="h-bloom h-bloom-a" aria-hidden="true" />
      <div className="h-bloom h-bloom-b" aria-hidden="true" />
      <div className="h-vignette" aria-hidden="true" />
      <div className="h-grain" aria-hidden="true" />

      <div className="h-in relative mx-auto w-full max-w-3xl text-center">
        {/* Signature : d'où vient le projet */}
        <p className="h-sign text-[var(--text-subtle)]">Fait par des gens du T3, pour le T3</p>

        <h1 className="h-display mt-10 text-white">Le Tier 3 francophone a enfin ses chiffres.</h1>

        <p className="h-lede mx-auto mt-7 max-w-xl text-[var(--text-muted)]">
          Chaque match de chaque tournoi est analysé : scoreboard complet, timeline des rounds, ACS,
          ADR, KAST, first bloods et plus encore. Plus besoin de fouiller X pour retrouver un
          résultat.
        </p>

        <div className="mt-11 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
          {isLoggedIn ? (
            <Link
              href={primaryHref}
              className="h-act inline-flex items-center justify-center rounded-[var(--r-md)] bg-[var(--accent)] px-7 py-3.5 font-semibold"
            >
              Mon profil
            </Link>
          ) : (
            <form action={signInAction}>
              <button className="h-act inline-flex items-center justify-center rounded-[var(--r-md)] bg-[var(--accent)] px-7 py-3.5 font-semibold">
                Rejoindre avec Discord
              </button>
            </form>
          )}
          <Link
            href="/matchs"
            className="h-act font-medium text-[var(--text-muted)] underline-offset-4 transition-colors hover:text-white hover:underline"
          >
            Voir les matchs analysés
          </Link>
        </div>
      </div>
    </section>
  );
}
