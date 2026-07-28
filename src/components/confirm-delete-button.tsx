"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

interface ConfirmDeleteButtonProps {
  /** Server action à exécuter une fois la suppression confirmée. */
  action: () => void | Promise<void>;
  /** Libellé du bouton déclencheur (ex. « Supprimer l'équipe »). */
  label: string;
  /** Titre affiché dans la boîte de dialogue. */
  title: string;
  /** Message d'avertissement affiché dans la boîte de dialogue. */
  message: string;
}

/** Bouton de confirmation interne, avec état « en cours » via useFormStatus. */
function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-[var(--destructive)] px-4 py-2 text-sm font-semibold text-[var(--accent-foreground)] transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "Suppression…" : "Supprimer"}
    </button>
  );
}

/**
 * Déclenche une suppression (server action) après confirmation dans une
 * boîte de dialogue custom - pas d'alerte native du navigateur.
 */
export default function ConfirmDeleteButton({
  action,
  label,
  title,
  message,
}: ConfirmDeleteButtonProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded border border-[var(--accent)] px-3 py-1.5 text-sm text-[var(--accent)] transition-colors hover:bg-[var(--accent-soft)]"
      >
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={() => setOpen(false)}
        >
          <div
            className="animate-in w-full max-w-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-white">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">{message}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-white transition-colors hover:bg-[var(--card-hover)]"
              >
                Annuler
              </button>
              <form action={action}>
                <ConfirmButton />
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
