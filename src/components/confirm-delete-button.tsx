"use client";

import { createPortal } from "react-dom";
import { useFormStatus } from "react-dom";
import { useDialog } from "@/hooks/use-dialog";

interface ConfirmDeleteButtonProps {
  /** Server action à exécuter une fois la suppression confirmée. */
  action: () => void | Promise<void>;
  /** Libellé du bouton déclencheur (ex. « Supprimer l'équipe »). */
  label: string;
  /** Titre affiché dans la boîte de dialogue. */
  title: string;
  /** Message d'avertissement affiché dans la boîte de dialogue. */
  message: string;
  /** Libellé du bouton de confirmation. Défaut : « Supprimer ». */
  confirmLabel?: string;
  /** Libellé pendant l'exécution. Défaut : « Suppression… ». */
  pendingLabel?: string;
}

/** Bouton de confirmation interne, avec état « en cours » via useFormStatus. */
function ConfirmButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-[var(--destructive)] px-4 py-2 text-sm font-semibold text-[var(--accent-foreground)] transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

/**
 * Déclenche une suppression (server action) après confirmation dans une
 * boîte de dialogue custom - pas d'alerte native du navigateur.
 *
 * La mécanique de dialogue vient de `useDialog`, partagée avec `NavDrawer` et
 * `ShareCardButton`.
 */
export default function ConfirmDeleteButton({
  action,
  label,
  title,
  message,
  confirmLabel = "Supprimer",
  pendingLabel = "Suppression…",
}: ConfirmDeleteButtonProps) {
  const { open, shown, closing, mounted, panelRef, ouvrir, fermer } = useDialog();

  return (
    <>
      <button
        type="button"
        onClick={ouvrir}
        className="rounded border border-[var(--accent)] px-3 py-1.5 text-sm text-[var(--accent)] transition-colors hover:bg-[var(--accent-soft)]"
      >
        {label}
      </button>

      {open &&
        mounted &&
        createPortal(
          <div
            className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-200 ${
              shown ? "opacity-100" : "opacity-0"
            }`}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={fermer}
          >
            <div
              ref={panelRef}
              tabIndex={-1}
              className={`t-modal w-full max-w-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl outline-none ${
                shown ? "is-open" : closing ? "is-closing" : ""
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-base font-semibold text-white">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">{message}</p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={fermer}
                  className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-white transition-colors hover:bg-[var(--card-hover)]"
                >
                  Annuler
                </button>
                <form action={action}>
                  <ConfirmButton label={confirmLabel} pendingLabel={pendingLabel} />
                </form>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
