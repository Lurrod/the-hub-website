"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Tiroir de navigation mobile.
 *
 * Même mécanique que `ConfirmDeleteButton` et `UserMenu` : portail dans
 * `<body>`, trois états (`open` monté, `shown` déployé, `closing` en repli)
 * pour que la fermeture ait le temps de s'animer, fermeture à Échap et au clic
 * hors du panneau, verrou du défilement de la page pendant l'ouverture.
 *
 * Le contenu est passé en `children` : ce sont des composants serveur (les
 * liens, qui dépendent de la session pour l'entrée Admin). Seul l'habillage
 * est client.
 */
export default function NavDrawer({
  children,
  label = "Menu",
}: {
  children: React.ReactNode;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Le portail ne peut pas exister au premier rendu, serveur comme client.
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const close = useCallback(() => {
    setShown(false);
    setClosing(true);
    const closeMs =
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue("--drawer-close-dur")
      ) || 150;
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      setClosing(false);
      setOpen(false);
    }, closeMs);
  }, []);

  useEffect(() => {
    if (!open) return;
    // Une frame de latence : sans ce délai le panneau naît déjà déployé et se
    // pose sans transition.
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

  // Le focus part sur le panneau à l'ouverture : au clavier comme au lecteur
  // d'écran, on doit se retrouver dans le menu qu'on vient d'ouvrir.
  useEffect(() => {
    if (shown) panelRef.current?.focus();
  }, [shown]);

  useEffect(
    () => () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    },
    []
  );

  return (
    <>
      <button
        type="button"
        onClick={() => (open ? close() : (setClosing(false), setOpen(true)))}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="grid h-8 w-8 shrink-0 place-items-center rounded border border-[var(--border)] bg-[var(--card)] text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-white md:hidden"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      {open &&
        mounted &&
        createPortal(
          <div
            className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-200 md:hidden ${
              shown ? "opacity-100" : "opacity-0"
            }`}
            onClick={close}
          >
            <div
              ref={panelRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label={label}
              onClick={(e) => e.stopPropagation()}
              className={`t-drawer flex h-full w-72 max-w-[80vw] flex-col border-r border-[var(--border-strong)] bg-[var(--shell)] shadow-2xl outline-none ${
                shown ? "is-open" : closing ? "is-closing" : ""
              }`}
            >
              <div className="flex h-[47px] shrink-0 items-center justify-between border-b border-[var(--border)] pl-5 pr-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-subtle)]">
                  {label}
                </span>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Fermer le menu"
                  className="grid h-8 w-8 place-items-center rounded text-[var(--text-muted)] transition-colors hover:text-white"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>

              {/* `onClickCapture` plutôt qu'un rappel passé à chaque lien : le
                  contenu vient du serveur, on ne peut pas lui greffer de
                  fonction. Un clic sur n'importe quel lien referme le tiroir. */}
              <nav
                aria-label="Navigation principale"
                className="min-h-0 flex-1 overflow-y-auto py-2"
                onClickCapture={(e) => {
                  if ((e.target as HTMLElement).closest("a")) close();
                }}
              >
                {children}
              </nav>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
