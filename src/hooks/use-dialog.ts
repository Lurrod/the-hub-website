"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useFocusTrap } from "@/hooks/use-focus-trap";

/** Repli par défaut si la variable de durée est absente de la charte. */
const CLOSE_FALLBACK_MS = 150;

export type Dialog = {
  /** Le portail est monté. Reste vrai pendant le repli. */
  open: boolean;
  /** Le panneau est déployé : c'est l'état `.is-open`. */
  shown: boolean;
  /** Le panneau se replie : c'est l'état `.is-closing`. */
  closing: boolean;
  /** Le portail est utilisable — faux au premier rendu, serveur comme client. */
  mounted: boolean;
  /** À poser sur le panneau, qui doit aussi porter `tabIndex={-1}`. */
  panelRef: RefObject<HTMLDivElement | null>;
  ouvrir: () => void;
  fermer: () => void;
  /** Ouvre ou replie selon l'état courant. Sert aux déclencheurs à bascule. */
  basculer: () => void;
};

/**
 * Mécanique commune des boîtes de dialogue : trois états, repli animé, Échap,
 * verrou du défilement, confinement du focus et disponibilité du portail.
 *
 * Trois états et non un seul (`open` monté, `shown` déployé, `closing` en
 * repli) : le panneau doit rester monté le temps de son animation de sortie,
 * et doit avoir été peint à son état de repos avant de s'ouvrir — d'où la
 * frame de latence avant `shown`.
 *
 * Ce bloc était recopié à l'identique dans `ConfirmDeleteButton`, `NavDrawer`
 * et `ShareCardButton` — 28 à 43 lignes chacun. Un correctif d'accessibilité
 * sur le piège de focus ou sur la restitution du défilement devait donc être
 * appliqué trois fois.
 *
 * Le rendu reste à l'appelant : un tiroir et une modale centrée n'ont ni la
 * même structure ni les mêmes classes. Seule la machine à états est partagée.
 *
 * @param closeDurVar variable CSS portant la durée du repli, pour que le
 *   démontage suive exactement l'animation déclarée dans la charte.
 */
export function useDialog(closeDurVar: string = "--modal-close-dur"): Dialog {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Le portail vise `<body>` : `template.tsx` enveloppe chaque page dans un
  // conteneur qui anime `transform` et qui, avec `animation-fill-mode: both`,
  // reste un bloc conteneur une fois l'animation finie. Un `position: fixed`
  // s'y ancrerait au lieu de la fenêtre, et le panneau se centrerait au milieu
  // de la page entière.
  const [mounted, setMounted] = useState(false);
  // Drapeau de montage : il ne peut par définition pas être connu au premier
  // rendu, serveur comme client.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const fermer = useCallback(() => {
    setShown(false);
    setClosing(true);
    const closeMs =
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue(closeDurVar)) ||
      CLOSE_FALLBACK_MS;
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      setClosing(false);
      setOpen(false);
    }, closeMs);
  }, [closeDurVar]);

  const ouvrir = useCallback(() => {
    // `closing` est remis à plat : rouvrir pendant un repli doit repartir de
    // l'état de repos, pas reprendre l'animation de sortie en cours.
    setClosing(false);
    setOpen(true);
  }, []);

  const basculer = useCallback(() => {
    if (open) fermer();
    else ouvrir();
  }, [open, fermer, ouvrir]);

  useEffect(() => {
    if (!open) return;
    // Une frame de latence : sans ce délai, le panneau naît déjà porteur de
    // `.is-open` et se pose sans transition.
    const raf = requestAnimationFrame(() => setShown(true));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") fermer();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, fermer]);

  // Le focus entre dans le panneau, y est confiné, et repart sur le
  // déclencheur à la fermeture (WCAG 2.2, critères 2.1.2 et 2.4.3).
  useFocusTrap(panelRef, open);

  useEffect(
    () => () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    },
    []
  );

  return { open, shown, closing, mounted, panelRef, ouvrir, fermer, basculer };
}
