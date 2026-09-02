"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Segmented from "@/components/segmented";
import { useDialog } from "@/hooks/use-dialog";
import type { ShareVariant } from "@/lib/og/share-variants";

interface ShareCardButtonProps {
  /** Au moins une entrée ; le sélecteur n'apparaît qu'à partir de deux. */
  variants: readonly ShareVariant[];
  /** Adresse absolue de la fiche, celle qu'on copie. */
  pageUrl: string;
  /** Titre de la boîte de dialogue (ex. « Partager le match »). */
  title: string;
  /** Base du texte alternatif ; le libellé de la variante y est ajouté. */
  alt: string;
}

/** Durée d'affichage du retour « Lien copié », en millisecondes. */
const COPIED_MS = 2000;

/**
 * Bouton « Partager » et sa boîte de dialogue : aperçu de la carte,
 * téléchargement du PNG, copie du lien de la fiche, et partage natif sur les
 * appareils qui savent recevoir un fichier.
 *
 * La mécanique de dialogue vient de `useDialog`, partagée avec
 * `ConfirmDeleteButton` et `NavDrawer`.
 *
 * L'aperçu n'est monté qu'avec le panneau : une fiche consultée sans clic sur
 * « Partager » ne déclenche aucune génération d'image côté serveur.
 */
export default function ShareCardButton({ variants, pageUrl, title, alt }: ShareCardButtonProps) {
  const { open, shown, closing, mounted, panelRef, ouvrir, fermer } = useDialog();
  const [copied, setCopied] = useState(false);
  const [active, setActive] = useState(variants[0].key);
  // Statut de chargement par variante : revenir sur une carte déjà vue ne doit
  // pas rejouer le squelette, et un échec ne doit pas contaminer les autres.
  const [status, setStatus] = useState<Record<string, "ok" | "ko">>({});
  const [canShareFiles, setCanShareFiles] = useState(false);

  const current = variants.find((v) => v.key === active) ?? variants[0];
  const state = status[current.key];
  const copiedTimer = useRef<number | null>(null);

  // `canShare` avec un fichier factice : c'est la seule façon de savoir si
  // l'appareil accepte le partage de fichiers avant d'avoir téléchargé
  // l'image. Sur navigateur de bureau, l'API existe souvent sans accepter les
  // fichiers — d'où le test sur un `File`, et non sur la seule présence de
  // `navigator.share`.
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.canShare || !navigator.share) return;
    try {
      const probe = new File([new Blob()], "carte.png", { type: "image/png" });
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCanShareFiles(navigator.canShare({ files: [probe] }));
    } catch {
      // Un environnement sans constructeur `File` n'est pas un cas d'erreur :
      // il n'a simplement pas le partage de fichiers.
    }
  }, []);

  useEffect(
    () => () => {
      if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
    },
    []
  );

  // C'est le lien de la *page* qui est copié, pas celui de l'image : lui seul
  // déclenche un aperçu chez le destinataire et le ramène sur le site.
  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(() => setCopied(false), COPIED_MS);
    } catch {
      // Presse-papiers refusé (contexte non sécurisé, permission déniée) : le
      // lien reste accessible dans la barre d'adresse, on n'alarme pas.
    }
  }, [pageUrl]);

  const shareFile = useCallback(async () => {
    try {
      const response = await fetch(current.imageUrl);
      if (!response.ok) return;
      const file = new File([await response.blob()], current.filename, { type: "image/png" });
      if (!navigator.canShare({ files: [file] })) return;
      await navigator.share({ files: [file], title, url: pageUrl });
    } catch {
      // Un partage annulé par l'utilisateur lève, comme un échec réseau. Ni
      // l'un ni l'autre ne mérite un message : la boîte reste ouverte, les
      // deux autres sorties restent disponibles.
    }
  }, [current, title, pageUrl]);

  return (
    <>
      {/* `aria-label` plutôt que le seul texte : le libellé disparaît sous
          `sm`, où la ligne qui accueille le bouton n'a plus la place de le
          porter. Sans lui, le bouton n'aurait plus de nom sur mobile. */}
      <button
        type="button"
        onClick={ouvrir}
        aria-label="Partager"
        className="flex shrink-0 items-center gap-1.5 rounded border border-[var(--border)] px-2 py-1.5 text-xs text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-white sm:px-2.5"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3.5 w-3.5"
          aria-hidden="true"
        >
          <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
          <path d="M12 15V3" />
          <path d="m8 7 4-4 4 4" />
        </svg>
        <span className="hidden sm:inline">Partager</span>
      </button>

      {open &&
        mounted &&
        createPortal(
          <div
            className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-200 ${
              shown ? "opacity-100" : "opacity-0"
            }`}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={fermer}
          >
            <div
              ref={panelRef}
              tabIndex={-1}
              className={`t-modal w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl outline-none ${
                shown ? "is-open" : closing ? "is-closing" : ""
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-base font-semibold text-white">{title}</h2>
                <button
                  type="button"
                  onClick={fermer}
                  aria-label="Fermer"
                  className="-mr-1 -mt-1 grid h-8 w-8 shrink-0 place-items-center rounded text-[var(--text-muted)] transition-colors hover:text-white"
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

              {variants.length > 1 && (
                <div
                  className="mt-3 -mx-1 overflow-x-auto px-1"
                  tabIndex={0}
                  role="region"
                  aria-label="Variantes de carte, défilement horizontal"
                >
                  <Segmented activeKey={current.key} variant="pill">
                    {variants.map((v) => (
                      <button
                        key={v.key}
                        type="button"
                        onClick={() => setActive(v.key)}
                        aria-selected={v.key === current.key}
                        role="tab"
                        className="t-tab shrink-0"
                      >
                        {v.label}
                      </button>
                    ))}
                  </Segmented>
                </div>
              )}

              <div className="mt-3 overflow-hidden rounded-lg border border-[var(--border)]">
                {state === "ko" ? (
                  <p className="grid aspect-square place-items-center px-6 text-center text-sm text-[var(--text-muted)]">
                    L&apos;aperçu n&apos;a pas pu être chargé. Le téléchargement reste possible.
                  </p>
                ) : (
                  <>
                    {/* Le carré est réservé avant l'arrivée de l'image : sans
                        lui, le panneau se redimensionne sous le curseur au
                        moment où l'aperçu se pose. */}
                    {state !== "ok" && (
                      <div className="aspect-square animate-pulse bg-[var(--card)]" />
                    )}
                    {/* `key` : changer de variante doit remonter l'image, sinon
                        `onLoad` ne se rejoue pas et le squelette reste. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      key={current.key}
                      src={current.imageUrl}
                      alt={variants.length > 1 ? `${alt} — ${current.label}` : alt}
                      width={1080}
                      height={1080}
                      onLoad={() => setStatus((s) => ({ ...s, [current.key]: "ok" }))}
                      onError={() => setStatus((s) => ({ ...s, [current.key]: "ko" }))}
                      className={`block w-full ${state === "ok" ? "" : "hidden"}`}
                    />
                  </>
                )}
              </div>

              <div className="mt-4 flex flex-col gap-2">
                <a
                  href={current.imageUrl}
                  download={current.filename}
                  className="rounded-lg bg-[var(--accent)] px-4 py-2 text-center text-sm font-semibold text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)]"
                >
                  Télécharger le PNG
                </a>

                {canShareFiles && (
                  <button
                    type="button"
                    onClick={shareFile}
                    className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-white transition-colors hover:bg-[var(--card-hover)]"
                  >
                    Partager l&apos;image
                  </button>
                )}

                <button
                  type="button"
                  onClick={copyLink}
                  className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-white transition-colors hover:bg-[var(--card-hover)]"
                >
                  {copied ? "Lien copié" : "Copier le lien"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
