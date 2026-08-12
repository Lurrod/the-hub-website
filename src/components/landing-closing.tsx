import Link from "next/link";

/**
 * Dernière bande de la landing : on redonne l'action une fois la démonstration
 * lue, sans réintroduire d'arguments. Volontairement minimale — le hero a déjà
 * porté la promesse, ici il ne reste que le geste à faire.
 */
export default function LandingClosing({
  isLoggedIn,
  primaryHref,
  signInAction,
}: {
  isLoggedIn: boolean;
  primaryHref: string;
  signInAction: () => Promise<void>;
}) {
  return (
    <section className="border-t border-[var(--border)]">
      <div className="lf-reveal mx-auto flex max-w-2xl flex-col items-center gap-7 px-4 py-24 text-center sm:py-32">
        <h2 className="lf-h2 text-balance text-white">Le Tier 3 mérite mieux qu&apos;un thread.</h2>
        <p className="lf-lede max-w-md text-[var(--text-muted)]">
          Créez votre fiche en un clic avec Discord. C&apos;est gratuit, et ça le restera.
        </p>
        {isLoggedIn ? (
          <Link
            href={primaryHref}
            className="lf-act inline-flex items-center justify-center rounded-[var(--r-md)] bg-[var(--accent)] px-7 py-3.5 font-semibold text-white"
          >
            Mon profil
          </Link>
        ) : (
          <form action={signInAction}>
            <button className="lf-act inline-flex items-center justify-center rounded-[var(--r-md)] bg-[var(--accent)] px-7 py-3.5 font-semibold text-white">
              Rejoindre avec Discord
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
