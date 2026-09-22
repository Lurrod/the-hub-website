import Link from "next/link";
import LandingMap from "@/components/landing-map";

/**
 * Première section de la landing : la carte tactique.
 *
 * Le texte tient dans une colonne, en bas à gauche ; la carte occupe le reste
 * de l'écran, couchée en perspective, et ses pings sont les portes d'entrée du
 * site. Le hero centré sur un halo d'accent qu'elle remplace était propre mais
 * interchangeable — n'importe quel site aurait pu le porter. Une carte vue de
 * dessus, un joueur de Valorant la lit avant d'avoir lu le titre.
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
    <section className="relative isolate overflow-hidden border-b border-[var(--border)] lg:min-h-[calc(100dvh-48px)]">
      <div className="h-bloom h-bloom-c" aria-hidden="true" />
      <div className="h-vignette" aria-hidden="true" />
      <div className="h-grain" aria-hidden="true" />

      {/* En colonne unique, la carte passe au-dessus du texte ; en large, elle
          se glisse dessous et déborde à droite. Les marges négatives la
          laissent sortir du cadre : un plan qui s'arrête net ferait maquette. */}
      <div className="relative -mb-[10%] px-2 pt-2 sm:-mx-[6%] sm:px-0 lg:absolute lg:inset-y-0 lg:right-[1%] lg:left-[max(38%,calc(50%-40px))] lg:m-0 lg:flex lg:items-center">
        <div className="w-full">
          <LandingMap />
        </div>
      </div>

      {/* La colonne de texte couvre toute la largeur du conteneur : sans
          `pointer-events-none`, elle se posait sur la carte et avalait les
          clics des pings — seul celui qui dépassait du conteneur réagissait. */}
      <div className="pointer-events-none relative mx-auto flex w-full max-w-6xl px-4 pb-20 pt-4 lg:min-h-[calc(100dvh-48px)] lg:items-end lg:pb-24">
        <div className="h-in pointer-events-auto max-w-xl">
          <p className="h-sign text-[var(--text-subtle)]">Fait par des gens du T3, pour le T3</p>

          <h1 className="h-display mt-7 text-balance text-white">
            Le Tier 3 francophone a enfin ses chiffres.
          </h1>

          <p className="h-lede mt-6 max-w-md text-pretty text-[var(--text-muted)]">
            Chaque match de chaque tournoi est analysé : scoreboard complet, timeline des rounds,
            ACS, ADR, KAST, first bloods et plus encore. Plus besoin de fouiller X pour retrouver un
            résultat.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
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
      </div>
    </section>
  );
}
