"use client";

import "./globals.css";

/**
 * Dernier recours : cette frontière ne se déclenche que si le layout racine
 * lui-même échoue. Elle remplace alors tout le document, d'où les balises
 * `<html>` et `<body>` obligatoires et l'import explicite des styles.
 *
 * Volontairement autonome : ni navigation, ni pied de page, ni police
 * personnalisée — tout cela vient du layout, précisément ce qui vient
 * d'échouer. Les métadonnées ne sont pas prises en charge ici, le titre passe
 * donc par le composant `<title>` de React.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body>
        <title>Erreur · The Hub</title>
        <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 text-center">
          <p className="font-mono text-sm uppercase tracking-widest text-[var(--accent)]">Erreur</p>
          <h1 className="mt-3 text-2xl font-bold text-white">
            Le site n&apos;a pas pu s&apos;afficher
          </h1>
          <p className="mt-4 text-[var(--text-muted)]">
            Une erreur est survenue avant même le chargement de la page.
          </p>
          {error.digest && (
            <p className="mt-3 font-mono text-xs text-[var(--text-subtle)]">
              Référence : {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            className="mt-8 inline-flex items-center justify-center rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
          >
            Recharger
          </button>
        </main>
      </body>
    </html>
  );
}
