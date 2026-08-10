"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Affiche le lien d'invitation complet + un bouton « Copier ».
 * Si `link` est relatif (NEXT_PUBLIC_BASE_URL absent), on préfixe l'origine
 * courante côté client - via useEffect pour éviter tout hydration mismatch.
 */
export default function InviteLink({ link }: { link: string }) {
  const [url, setUrl] = useState(link);
  const labelRef = useRef<HTMLSpanElement>(null);
  const revert = useRef<number | null>(null);

  useEffect(() => {
    // l'origine n'existe qu'au navigateur : la lire au rendu provoquerait un
    // écart d'hydratation, c'est précisément ce que cet effet évite.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (link.startsWith("/")) setUrl(window.location.origin + link);
  }, [link]);

  useEffect(
    () => () => {
      if (revert.current) window.clearTimeout(revert.current);
    },
    []
  );

  /**
   * Bascule du libellé en trois temps (snippet `04-text-states-swap`) : sortie
   * vers le haut, changement du texte hors transition, puis retour depuis le
   * bas. Le texte est écrit directement dans le DOM et non via React : c'est
   * le seul moyen de garder les trois phases dans le même frame que le reflow.
   */
  function swapLabel(next: string) {
    const el = labelRef.current;
    if (!el) return;
    const dur =
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--text-swap-dur")) ||
      150;
    el.classList.add("is-exit");
    window.setTimeout(() => {
      el.textContent = next;
      el.classList.remove("is-exit");
      el.classList.add("is-enter-start");
      void el.offsetHeight; // reflow : sans lui la phase d'entrée ne rejoue pas
      el.classList.remove("is-enter-start");
    }, dur);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      swapLabel("Copié !");
      if (revert.current) window.clearTimeout(revert.current);
      revert.current = window.setTimeout(() => swapLabel("Copier"), 1500);
    } catch {
      const el = document.getElementById("invite-url") as HTMLInputElement | null;
      el?.select();
    }
  }

  return (
    <div className="flex items-stretch gap-2">
      <input
        id="invite-url"
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-white"
      />
      <button
        type="button"
        onClick={copy}
        className="shrink-0 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition-colors duration-[130ms] hover:bg-[var(--accent-hover)]"
      >
        <span ref={labelRef} className="t-text-swap" suppressHydrationWarning>
          Copier
        </span>
      </button>
    </div>
  );
}
