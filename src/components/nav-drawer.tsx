"use client";

import { createPortal } from "react-dom";
import { useDialog } from "@/hooks/use-dialog";

/**
 * Tiroir de navigation mobile.
 *
 * La mécanique — portail dans `<body>`, trois états pour laisser la fermeture
 * s'animer, Échap, verrou du défilement, focus confiné — vient de `useDialog`,
 * partagée avec `ConfirmDeleteButton` et `ShareCardButton`. Ne reste ici que ce
 * qui est propre au tiroir : sa durée de repli et son habillage.
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
  // Le tiroir a sa propre durée de repli : elle est plus courte que celle des
  // modales centrées.
  const { open, shown, closing, mounted, panelRef, fermer, basculer } =
    useDialog("--drawer-close-dur");

  return (
    <>
      <button
        type="button"
        onClick={basculer}
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
            onClick={fermer}
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
                  onClick={fermer}
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
                  if ((e.target as HTMLElement).closest("a")) fermer();
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
