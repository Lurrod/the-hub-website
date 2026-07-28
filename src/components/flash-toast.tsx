"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { resolveFlash, type FlashKind } from "@/lib/flash-messages";

function Icon({ kind }: { kind: FlashKind }) {
  const color = kind === "success" ? "var(--success)" : "var(--destructive)";
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0"
      aria-hidden="true"
    >
      {kind === "success" ? (
        <path d="M20 6 9 17l-5-5" />
      ) : (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5" />
          <path d="M12 16h.01" />
        </>
      )}
    </svg>
  );
}

/**
 * Petit toast de retour : lit `?ok=` / `?error=`, s'affiche brièvement en bas
 * à droite puis disparaît. Nettoie l'URL immédiatement pour ne pas ré-apparaître.
 */
export default function FlashToast() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [flash, setFlash] = useState<ReturnType<typeof resolveFlash>>(null);
  const [show, setShow] = useState(false);

  const ok = params.get("ok");
  const error = params.get("error");

  useEffect(() => {
    const f = resolveFlash(ok, error);
    if (!f) return;
    setFlash(f);
    setShow(true);

    // Querystring sans les codes flash, appliqué SEULEMENT à la fin (sinon le
    // changement d'URL relance l'effet et annule les timers → toast figé).
    const next = new URLSearchParams(params.toString());
    next.delete("ok");
    next.delete("error");
    const strippedQs = next.toString();

    const hide = setTimeout(() => setShow(false), 2000);
    const clear = setTimeout(() => {
      setFlash(null);
      router.replace(strippedQs ? `${pathname}?${strippedQs}` : pathname, { scroll: false });
    }, 2300);
    return () => {
      clearTimeout(hide);
      clearTimeout(clear);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok, error]);

  if (!flash) return null;

  const accent = flash.kind === "success" ? "var(--success)" : "var(--destructive)";

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50">
      <div
        className={`flex max-w-xs items-start gap-2.5 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2.5 shadow-xl transition-all duration-300 ${
          show ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        }`}
        style={{ borderLeft: `3px solid ${accent}` }}
        role="status"
      >
        <Icon kind={flash.kind} />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-white">{flash.title}</p>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">{flash.message}</p>
        </div>
      </div>
    </div>
  );
}
