"use client";

import { useRef, useState, type DragEvent } from "react";

const ACCEPT = ["image/png", "image/jpeg", "image/webp"];

/**
 * Champ d'upload d'image amélioré : aperçu, nom de fichier, croix pour retirer,
 * glisser-déposer et validation (format + taille). Reste un vrai <input file>
 * caché portant `name`, donc compatible avec les server actions (FormData).
 */
export default function ImageUpload({
  name,
  currentUrl = null,
  shape = "square",
  maxSizeMb = 5,
}: {
  name: string;
  currentUrl?: string | null;
  shape?: "square" | "round" | "wide";
  maxSizeMb?: number;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const isNew = fileName !== null;

  const box =
    shape === "wide" ? "aspect-[3/1] w-48" : shape === "round" ? "h-24 w-24" : "h-24 w-24";
  const radius = shape === "round" ? "rounded-full" : "rounded-lg";

  function handleFile(f: File | undefined | null) {
    if (!f) return;
    if (!ACCEPT.includes(f.type)) {
      setError("Format non supporté - PNG, JPEG ou WebP.");
      return;
    }
    if (f.size > maxSizeMb * 1024 * 1024) {
      setError(`Fichier trop lourd - max ${maxSizeMb} Mo.`);
      return;
    }
    setError(null);
    setPreview(URL.createObjectURL(f));
    setFileName(f.name);
  }

  function clear() {
    if (ref.current) ref.current.value = "";
    setPreview(currentUrl);
    setFileName(null);
    setError(null);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f && ref.current) {
      const dt = new DataTransfer();
      dt.items.add(f);
      ref.current.files = dt.files;
      handleFile(f);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <div
          onClick={() => ref.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`relative grid ${box} ${radius} shrink-0 cursor-pointer place-items-center overflow-hidden border transition-colors ${
            dragging
              ? "border-[var(--accent)] bg-[var(--accent-soft)]"
              : "border-dashed border-[var(--border)] bg-[var(--bg)] hover:border-[var(--border-strong)]"
          }`}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="px-2 text-center text-[10px] text-[var(--text-muted)]">
              Cliquer ou glisser
            </span>
          )}
          {isNew && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                clear();
              }}
              aria-label="Retirer l'image"
              className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/70 text-sm leading-none text-white transition-colors hover:bg-black"
            >
              ×
            </button>
          )}
        </div>

        <div className="min-w-0 text-xs">
          {isNew ? (
            <div className="flex items-center gap-1.5 font-medium text-[var(--success)]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="h-3.5 w-3.5 shrink-0">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="truncate text-white">{fileName}</span>
            </div>
          ) : preview ? (
            <span className="text-[var(--text-muted)]">Image actuelle</span>
          ) : (
            <span className="text-[var(--text-muted)]">PNG, JPEG ou WebP · max {maxSizeMb} Mo</span>
          )}
          <div className="mt-1.5 flex gap-2">
            <button
              type="button"
              onClick={() => ref.current?.click()}
              className="rounded border border-[var(--border)] px-2 py-1 text-[var(--text-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              Choisir un fichier
            </button>
            {isNew && (
              <button
                type="button"
                onClick={clear}
                className="rounded border border-[var(--border)] px-2 py-1 text-[var(--text-muted)] transition-colors hover:border-[var(--destructive)] hover:text-[var(--destructive)]"
              >
                Retirer
              </button>
            )}
          </div>
        </div>
      </div>

      {error && <p className="mt-1.5 text-xs text-[var(--destructive)]">{error}</p>}

      <input
        ref={ref}
        type="file"
        name={name}
        accept={ACCEPT.join(",")}
        onChange={(e) => handleFile(e.target.files?.[0])}
        className="hidden"
      />
    </div>
  );
}
