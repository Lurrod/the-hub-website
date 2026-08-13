"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { resolveFlash, type FlashKind } from "@/lib/flash-messages";

/** Temps de lecture accordé : une erreur demande plus qu'une confirmation. */
const DURATIONS: Record<FlashKind, number> = { success: 4000, error: 6000 };

type Flash = NonNullable<ReturnType<typeof resolveFlash>> & { id: number };

function Icon({ kind }: { kind: FlashKind }) {
  const color = kind === "success" ? "var(--success)" : "var(--destructive)";
  const svg = (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5 shrink-0"
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

  // Le tracé de la coche est le seul à se dessiner : l'icône d'erreur reste
  // hors du wrapper, sinon ses trois tracés hériteraient du stroke-dasharray.
  if (kind !== "success") return svg;
  return (
    <span className="t-success-check shrink-0" data-state="in" aria-hidden="true">
      {svg}
    </span>
  );
}

/**
 * Toast de retour : lit `?ok=` / `?error=`, s'affiche en bas à droite, puis
 * s'efface quand sa barre de temps est vide.
 *
 * Le compte à rebours n'est pas un `setTimeout` mais l'animation de la barre
 * elle-même : c'est elle qui, en finissant, ferme le toast. Les deux ne peuvent
 * donc pas se désynchroniser, et suspendre la barre au survol suspend aussi la
 * fermeture. Les minuteurs JavaScript précédents, eux, étaient annulés à chaque
 * navigation faite pendant l'affichage — le toast restait alors figé à l'écran.
 */
export default function FlashToast() {
  const params = useSearchParams();
  const router = useRouter();
  const [flash, setFlash] = useState<Flash | null>(null);
  const [leaving, setLeaving] = useState(false);
  const seq = useRef(0);

  const ok = params.get("ok");
  const error = params.get("error");

  useEffect(() => {
    const f = resolveFlash(ok, error);
    // Pas de code dans l'URL : rien à annoncer, et surtout rien à retirer — le
    // toast en cours vit désormais sa vie sans dépendre de la querystring.
    if (!f) return;

    seq.current += 1;
    setFlash({ ...f, id: seq.current });
    setLeaving(false);
  }, [ok, error]);

  /**
   * Retire le code de l'URL une fois le message lu, pour qu'un rechargement ne
   * le rejoue pas. On relit l'adresse courante plutôt que la querystring du
   * rendu : entre l'affichage et la fermeture, le toast survit aux navigations,
   * et il ne doit pas réécrire l'URL d'une page qui n'est plus la sienne.
   */
  const cleanUrl = () => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("ok") && !url.searchParams.has("error")) return;
    url.searchParams.delete("ok");
    url.searchParams.delete("error");
    const qs = url.searchParams.toString();
    router.replace(qs ? `${url.pathname}?${qs}` : url.pathname, { scroll: false });
  };

  if (!flash) return null;

  const tone = flash.kind === "success" ? "var(--success)" : "var(--destructive)";
  const halo = flash.kind === "success" ? "var(--success-soft)" : "var(--destructive-soft)";

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex justify-end sm:inset-x-auto sm:bottom-5 sm:right-5">
      <div
        key={flash.id}
        role="status"
        data-state={leaving ? "out" : "in"}
        onAnimationEnd={(e) => {
          if (e.animationName.includes("toast-out") || e.animationName.includes("toast-fade-out")) {
            setFlash(null);
            setLeaving(false);
            cleanUrl();
          }
        }}
        style={{ "--toast-duration": `${DURATIONS[flash.kind]}ms` } as CSSProperties}
        className="t-toast pointer-events-auto relative w-full overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--card)] shadow-[var(--shadow-elev)] sm:w-[336px]"
      >
        <div className="flex items-start gap-3 p-3.5 pr-9">
          <span
            className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
            style={{ background: halo }}
          >
            <Icon kind={flash.kind} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white">{flash.title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-muted)]">
              {flash.message}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setLeaving(true)}
          aria-label="Fermer"
          className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md text-[var(--text-subtle)] transition-colors hover:bg-[var(--card-hover)] hover:text-white"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            className="h-3.5 w-3.5"
            aria-hidden="true"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        <span
          aria-hidden="true"
          className="t-toast-timer absolute inset-x-0 bottom-0 h-[2px]"
          style={{ background: tone }}
          onAnimationEnd={(e) => {
            if (e.animationName.includes("toast-timer")) setLeaving(true);
          }}
        />
      </div>
    </div>
  );
}
