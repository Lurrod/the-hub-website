"use client";

import { useEffect, useState } from "react";

/**
 * Affiche le lien d'invitation complet + un bouton « Copier ».
 * Si `link` est relatif (NEXT_PUBLIC_BASE_URL absent), on préfixe l'origine
 * courante côté client — via useEffect pour éviter tout hydration mismatch.
 */
export default function InviteLink({ link }: { link: string }) {
  const [url, setUrl] = useState(link);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (link.startsWith("/")) setUrl(window.location.origin + link);
  }, [link]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
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
        {copied ? "Copié !" : "Copier"}
      </button>
    </div>
  );
}
