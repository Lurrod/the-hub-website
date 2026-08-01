import Link from "next/link";
import type { ReactNode } from "react";

const ACTION =
  "inline-flex items-center justify-center rounded-lg bg-[var(--accent)] px-5 py-2.5 " +
  "text-sm font-semibold text-white transition-opacity hover:opacity-90";

const ACTION_SECONDARY =
  "inline-flex items-center justify-center rounded-lg border border-[var(--border-strong)] " +
  "px-5 py-2.5 text-sm font-medium text-[var(--text-muted)] transition-colors " +
  "hover:border-[var(--accent)] hover:text-white";

/**
 * Gabarit partagé des pages d'état (404, erreur serveur).
 *
 * Jusqu'ici ces situations affichaient la page brute de Next : fond blanc,
 * message anglais, aucun chemin de retour. Un lien d'invitation expiré — donc
 * un parcours d'entrée — y aboutissait.
 */
export default function StatusPage({
  code,
  title,
  children,
  action,
}: {
  /** Repère court affiché au-dessus du titre (« 404 », « Erreur »). */
  code: string;
  title: string;
  children: ReactNode;
  /** Bouton complémentaire, à gauche du retour à l'accueil. */
  action?: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
      <p className="font-mono text-sm uppercase tracking-widest text-[var(--accent)]">{code}</p>
      <h1 className="mt-3 text-2xl font-bold text-white sm:text-3xl">{title}</h1>
      <div className="mt-4 text-[var(--text-muted)]">{children}</div>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {action}
        <Link href="/" className={action ? ACTION_SECONDARY : ACTION}>
          Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  );
}

export { ACTION as STATUS_ACTION };
