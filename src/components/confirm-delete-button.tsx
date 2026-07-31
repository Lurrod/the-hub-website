"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  // `open` = portail monté, `shown` = .is-open, `closing` = .is-closing.
  // Trois états et non un seul : la modale doit rester montée le temps de son
  // repli, et doit avoir été peinte à son état de repos avant de s'ouvrir.
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<number | null>(null);

  // La modale est rendue dans <body> via un portail : `template.tsx` enveloppe
  // chaque page dans un `.animate-in` qui anime `transform`. Avec
  // `animation-fill-mode: both`, ce wrapper reste un bloc conteneur même une
  // fois l'animation finie, et un `position: fixed` s'y ancre au lieu de la
  // fenêtre - la modale se centrait alors au milieu de la page entière.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const close = useCallback(() => {
    setShown(false);
    setClosing(true);
    // Durée lue depuis la variable CSS pour rester en phase avec le snippet.
    const closeMs =
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue("--modal-close-dur")
      ) || 150;
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      setClosing(false);
      setOpen(false);
    }, closeMs);
  }, []);

  useEffect(() => {
    if (!open) return;
    // Un frame de latence : sans ce délai, l'élément naît déjà porteur de
    // .is-open et se pose sans transition.
    const raf = requestAnimationFrame(() => setShown(true));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  useEffect(() => () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded border border-[var(--accent)] px-3 py-1.5 text-sm text-[var(--accent)] transition-colors hover:bg-[var(--accent-soft)]"
      >
        {label}
      </button>

      {open && mounted && createPortal(
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-200 ${
            shown ? "opacity-100" : "opacity-0"
          }`}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={close}
        >
          <div
            className={`t-modal w-full max-w-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl ${
              shown ? "is-open" : closing ? "is-closing" : ""
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-white">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">{message}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-white transition-colors hover:bg-[var(--card-hover)]"
              >
                Annuler
              </button>
              <form action={action}>
                <ConfirmButton />
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
