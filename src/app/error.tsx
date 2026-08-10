"use client";

import StatusPage, { STATUS_ACTION } from "@/components/status-page";

/**
 * Frontière d'erreur de toute l'application (elle enveloppe loading, not-found,
 * les pages et les layouts imbriqués — mais pas le layout racine, dont
 * `global-error.tsx` se charge).
 *
 * Le message d'origine n'est volontairement pas affiché : en production, Next
 * remplace `error.message` par un texte générique pour les erreurs venues du
 * serveur, afin de ne rien divulguer. Seul `digest` reste exploitable, et il
 * permet de retrouver la trace correspondante dans les journaux du serveur.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <StatusPage
      code="Erreur"
      title="Quelque chose s'est mal passé"
      action={
        <button type="button" onClick={reset} className={STATUS_ACTION}>
          Réessayer
        </button>
      }
    >
      <p>
        L&apos;action n&apos;a pas pu aboutir. Réessayer suffit le plus souvent ; si le problème
        persiste, signale-le sur le Discord de The Hub.
      </p>
      {error.digest && (
        <p className="mt-3 font-mono text-xs text-[var(--text-subtle)]">
          Référence : {error.digest}
        </p>
      )}
    </StatusPage>
  );
}
