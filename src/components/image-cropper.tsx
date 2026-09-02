"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import {
  CROP_ASPECT,
  CROP_OUTPUT,
  MAX_ZOOM,
  clampOffset,
  clampZoom,
  computeCropRect,
  displayedSize,
  minZoom,
  type CropShape,
  type Offset,
  type Size,
} from "@/lib/crop";

interface ImageCropperProps {
  /** Fichier choisi par l'utilisateur, jamais modifié : on repart de lui à chaque réouverture. */
  file: File;
  shape: CropShape;
  /** Fermeture sans appliquer (croix, Échap, clic sur le fond, Annuler). */
  onCancel: () => void;
  /** Recadrage validé : nouveau fichier prêt à partir dans le FormData. */
  onApply: (cropped: File) => void;
}

/** Extension cohérente avec le type réellement produit par `canvas.toBlob`. */
function renameFor(name: string, mime: string): string {
  const ext = mime === "image/png" ? "png" : mime === "image/jpeg" ? "jpg" : "webp";
  const base = name.replace(/\.[^./\\]+$/, "") || "image";
  return `${base}.${ext}`;
}

/**
 * Éditeur de recadrage : molette / pincement / curseur pour zoomer, glisser
 * pour cadrer. Le rendu final est écrit dans un canvas aux dimensions exactes
 * que le serveur produira (cf. `CROP_OUTPUT`), donc ce que l'on voit est ce
 * que l'on obtient. Sous le zoom 1 l'image rentre entièrement dans le cadre et
 * les marges restent transparentes - un logo large n'est pas rogné de force.
 */
export default function ImageCropper({ file, shape, onCancel, onApply }: ImageCropperProps) {
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<number | null>(null);

  const [url, setUrl] = useState<string | null>(null);
  const [natural, setNatural] = useState<Size | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [frame, setFrame] = useState<Size>({ width: 0, height: 0 });
  const [view, setView] = useState<{ zoom: number; offset: Offset }>({
    zoom: 1,
    offset: { x: 0, y: 0 },
  });

  const imageRef = useRef<HTMLImageElement | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, Offset>());
  const dragStart = useRef<{ x: number; y: number; offset: Offset } | null>(null);
  const pinchStart = useRef<{ dist: number; zoom: number } | null>(null);

  // drapeau de montage nécessaire au portail, inconnu au premier rendu.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  /** Ferme en jouant le repli de `.t-modal` avant de rendre la main au parent. */
  const finish = useCallback((done: () => void) => {
    setShown(false);
    setClosing(true);
    const closeMs =
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue("--modal-close-dur")
      ) || 150;
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(done, closeMs);
  }, []);

  const cancel = useCallback(() => finish(onCancel), [finish, onCancel]);

  useEffect(
    () => () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    },
    []
  );

  // Décodage hors DOM : donne les dimensions naturelles et l'objet passé plus
  // tard à drawImage, sans dépendre de l'aperçu affiché.
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    // createObjectURL est un effet de bord navigateur : son résultat ne peut
    // venir que d'ici.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(objectUrl);
    setFailed(false);
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setNatural({ width: img.naturalWidth, height: img.naturalHeight });
      setView({ zoom: 1, offset: { x: 0, y: 0 } });
    };
    img.onerror = () => setFailed(true);
    img.src = objectUrl;
    return () => {
      img.onload = null;
      img.onerror = null;
      imageRef.current = null;
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  // Un frame de latence avant `.is-open`, sinon la modale naît déjà ouverte.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancel();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [cancel]);

  // Le cadre est fluide (largeur de la modale) : on le mesure au lieu de le
  // supposer, toute la géométrie en dépend.
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const read = () => setFrame({ width: el.clientWidth, height: el.clientHeight });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [url]);

  /** Applique un zoom en gardant le point central : le décalage suit l'échelle. */
  const applyZoom = useCallback(
    (next: number) => {
      if (!natural) return;
      setView((v) => {
        const zoom = clampZoom(next, natural, frame);
        const ratio = v.zoom > 0 ? zoom / v.zoom : 1;
        const offset = clampOffset(
          { x: v.offset.x * ratio, y: v.offset.y * ratio },
          natural,
          frame,
          zoom
        );
        return { zoom, offset };
      });
    },
    [natural, frame]
  );

  // Re-clamp après mesure du cadre ou changement d'image : les bornes bougent.
  useEffect(() => {
    if (!natural || frame.width === 0) return;
    // re-clamp après mesure réelle du cadre : les bornes dépendent du layout,
    // pas des props.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setView((v) => {
      const zoom = clampZoom(v.zoom, natural, frame);
      return { zoom, offset: clampOffset(v.offset, natural, frame, zoom) };
    });
  }, [natural, frame]);

  // Molette : listener non passif, sinon `preventDefault` est refusé et la
  // page défile sous la modale.
  useEffect(() => {
    const el = frameRef.current;
    if (!el || !natural) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setView((v) => {
        const zoom = clampZoom(v.zoom * Math.exp(-e.deltaY * 0.0015), natural, frame);
        const ratio = v.zoom > 0 ? zoom / v.zoom : 1;
        return {
          zoom,
          offset: clampOffset(
            { x: v.offset.x * ratio, y: v.offset.y * ratio },
            natural,
            frame,
            zoom
          ),
        };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [natural, frame]);

  function distance(): number {
    const [a, b] = [...pointers.current.values()];
    if (!a || !b) return 0;
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!natural) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      dragStart.current = { x: e.clientX, y: e.clientY, offset: view.offset };
    } else if (pointers.current.size === 2) {
      dragStart.current = null;
      pinchStart.current = { dist: distance(), zoom: view.zoom };
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!natural || !pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size >= 2 && pinchStart.current) {
      const dist = distance();
      if (dist > 0 && pinchStart.current.dist > 0) {
        applyZoom((pinchStart.current.zoom * dist) / pinchStart.current.dist);
      }
      return;
    }

    const start = dragStart.current;
    if (!start) return;
    setView((v) => ({
      zoom: v.zoom,
      offset: clampOffset(
        { x: start.offset.x + (e.clientX - start.x), y: start.offset.y + (e.clientY - start.y) },
        natural,
        frame,
        v.zoom
      ),
    }));
  }

  function endPointer(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
    if (pointers.current.size === 0) dragStart.current = null;
  }

  async function apply() {
    const img = imageRef.current;
    if (!img || !natural || busy) return;
    setBusy(true);
    try {
      const out = CROP_OUTPUT[shape];
      const canvas = document.createElement("canvas");
      canvas.width = out.width;
      canvas.height = out.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        // Sans canvas exploitable, mieux vaut envoyer l'original que rien.
        finish(() => onApply(file));
        return;
      }
      ctx.imageSmoothingQuality = "high";
      const r = computeCropRect(natural, frame, view.zoom, view.offset);
      ctx.drawImage(img, r.sx, r.sy, r.sWidth, r.sHeight, 0, 0, out.width, out.height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", 0.92)
      );
      if (!blob) {
        finish(() => onApply(file));
        return;
      }
      // `toBlob` retombe silencieusement sur png si le type demandé n'est pas
      // supporté : on nomme le fichier d'après ce qui est vraiment sorti.
      const cropped = new File([blob], renameFor(file.name, blob.type), { type: blob.type });
      finish(() => onApply(cropped));
    } catch {
      setBusy(false);
      finish(() => onApply(file));
    }
  }

  // Le focus entre dans la modale, y est confiné et repart sur le bouton qui a
  // ouvert le recadrage à la fermeture (WCAG 2.1.2 / 2.4.3).
  useFocusTrap(panelRef, mounted);

  const shownSize = natural ? displayedSize(natural, frame, view.zoom) : null;
  // Arrondi au pas du curseur : une borne à 0,41666… désaligne toutes les
  // valeurs du `range` et le navigateur les recale de travers.
  const min = natural ? Math.floor(minZoom(natural, frame) * 100) / 100 : 1;
  const round = shape === "round";

  if (!mounted) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-200 ${
        shown ? "opacity-100" : "opacity-0"
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Recadrer l'image"
      onClick={cancel}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`t-modal w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl outline-none ${
          shown ? "is-open" : closing ? "is-closing" : ""
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-white">Recadrer l&apos;image</h2>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Glissez pour déplacer, molette ou curseur pour zoomer.
        </p>

        <div
          ref={frameRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          style={{ aspectRatio: String(CROP_ASPECT[shape]), touchAction: "none" }}
          className="relative mt-4 w-full cursor-grab overflow-hidden rounded-lg border border-[var(--border)] bg-[repeating-conic-gradient(var(--checker-a)_0_25%,var(--checker-b)_0_50%)] bg-[length:16px_16px] active:cursor-grabbing"
        >
          {url && shownSize && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt=""
              draggable={false}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: `${shownSize.width}px`,
                height: `${shownSize.height}px`,
                transform: `translate(-50%, -50%) translate(${view.offset.x}px, ${view.offset.y}px)`,
                maxWidth: "none",
              }}
            />
          )}
          {round && (
            // Voile en dehors du disque : une ombre géante déborde du cadre,
            // que `overflow-hidden` recoupe proprement.
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{ boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)" }}
            />
          )}
          {failed && (
            <p className="absolute inset-0 grid place-items-center px-4 text-center text-xs text-[var(--destructive)]">
              Image illisible.
            </p>
          )}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => applyZoom(view.zoom / 1.2)}
            aria-label="Dézoomer"
            disabled={!natural}
            className="grid h-7 w-7 shrink-0 place-items-center rounded border border-[var(--border)] text-white transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-40"
          >
            −
          </button>
          <input
            type="range"
            min={min}
            max={MAX_ZOOM}
            step={0.01}
            value={view.zoom}
            disabled={!natural}
            onChange={(e) => applyZoom(Number(e.target.value))}
            aria-label="Niveau de zoom"
            className="h-1 w-full cursor-pointer appearance-none rounded bg-[var(--border)] accent-[var(--accent)] disabled:opacity-40"
          />
          <button
            type="button"
            onClick={() => applyZoom(view.zoom * 1.2)}
            aria-label="Zoomer"
            disabled={!natural}
            className="grid h-7 w-7 shrink-0 place-items-center rounded border border-[var(--border)] text-white transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-40"
          >
            +
          </button>
        </div>

        <div className="mt-5 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setView({ zoom: 1, offset: { x: 0, y: 0 } })}
            className="rounded-lg px-2 py-2 text-xs text-[var(--text-muted)] transition-colors hover:text-white"
          >
            Réinitialiser
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={cancel}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-white transition-colors hover:bg-[var(--card-hover)]"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={apply}
              disabled={!natural || busy || failed}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-foreground)] transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {busy ? "Traitement…" : "Valider"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
