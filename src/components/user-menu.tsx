"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";

type Props = {
  pseudo: string;
  photo: string | null;
  profilHref: string;
  signOutAction: () => Promise<void>;
};

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export default function UserMenu({ pseudo, photo, profilHref, signOutAction }: Props) {
  const [open, setOpen] = useState(false);
  // Le menu reste monté en permanence : c'est ce qui permet d'animer sa
  // fermeture. `closing` porte l'état intermédiaire le temps du repli.
  const [closing, setClosing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setClosing(true);
    // Durée lue depuis la variable CSS pour rester en phase avec le snippet.
    const closeMs =
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue("--dropdown-close-dur")
      ) || 150;
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setClosing(false), closeMs);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  useEffect(
    () => () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    },
    []
  );

  const item =
    "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-white transition-colors duration-[130ms] hover:bg-[var(--card-hover)]";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => (open ? close() : (setClosing(false), setOpen(true)))}
        aria-haspopup="menu"
        aria-expanded={open}
        // `shrink-0` : entre 768 et 1024 px la barre est serrée (liens +
        // recherche + menu) et le bouton se faisait écraser.
        className="flex shrink-0 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] py-1 pl-1 pr-2.5 text-sm text-white transition-colors duration-[130ms] hover:border-[var(--border-strong)]"
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            loading="lazy"
            decoding="async"
            src={photo}
            alt=""
            className="h-7 w-7 rounded-full object-cover"
          />
        ) : (
          <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--surface)] text-[10px] font-medium text-[var(--text-muted)]">
            {pseudo.slice(0, 2).toUpperCase()}
          </span>
        )}
        <span className="max-w-[6rem] truncate lg:max-w-[9rem]">{pseudo}</span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-4 w-4 text-[var(--text-muted)] transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <div
        role="menu"
        inert={!open}
        data-origin="top-right"
        className={`t-dropdown absolute right-0 z-40 mt-2 w-52 overflow-hidden rounded-lg border border-[var(--border-strong)] bg-[var(--card)] py-1 shadow-xl ${
          open ? "is-open" : closing ? "is-closing" : ""
        }`}
      >
        <Link role="menuitem" href={profilHref} onClick={close} className={item}>
          <Icon>
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </Icon>
          Profil
        </Link>
        <Link role="menuitem" href="/profil" onClick={close} className={item}>
          <Icon>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V15z" />
          </Icon>
          Paramètres
        </Link>
        <div role="separator" className="my-1 h-px bg-[var(--border)]" />
        <form action={signOutAction}>
          <button role="menuitem" className={item}>
            <Icon>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </Icon>
            Déconnexion
          </button>
        </form>
      </div>
    </div>
  );
}
