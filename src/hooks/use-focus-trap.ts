"use client";

import { useEffect, type RefObject } from "react";

/**
 * Sélecteur des éléments naturellement atteignables au clavier. Les éléments
 * désactivés et ceux sortis de l'ordre de tabulation (`tabindex="-1"`) sont
 * exclus à la source : ils ne doivent ni recevoir le focus ni servir de borne
 * à la boucle.
 */
const FOCUSABLE = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "audio[controls]",
  "video[controls]",
  "[contenteditable]:not([contenteditable='false'])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * Éléments focusables réellement affichés. `getClientRects()` couvre à la fois
 * `display: none` et la visibilité par ancêtre, là où `offsetParent` se trompe
 * dès qu'un parent est en `position: fixed` — ce qui est précisément le cas de
 * nos boîtes de dialogue.
 */
function focusableItems(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.getClientRects().length > 0 && !el.closest("[inert]")
  );
}

/**
 * Confine le focus dans une boîte de dialogue modale et le rend à son
 * déclencheur à la fermeture — WCAG 2.2 AA, critères 2.1.2 (pas de fuite hors
 * du contexte modal) et 2.4.3 (ordre du focus).
 *
 * Sans cela, `role="dialog" aria-modal="true"` n'est qu'une annonce : la
 * tabulation continue de parcourir la page masquée derrière le panneau, que
 * l'utilisateur ne voit pas et ne peut pas actionner.
 *
 * Le conteneur visé doit porter `tabIndex={-1}` : quand le panneau ne contient
 * aucun élément focusable, ou quand le focus est parti sur le fond, c'est lui
 * qui le récupère.
 *
 * @param ref    conteneur du dialogue (le panneau, pas le fond).
 * @param active `true` tant que le dialogue est ouvert.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const panel = ref.current;
    if (!panel) return;

    // Mémorisé à l'ouverture, restauré à la fermeture : c'est le point de
    // retour attendu au clavier comme au lecteur d'écran.
    const opener = document.activeElement as HTMLElement | null;

    // Le focus n'entre dans le panneau que s'il n'y est pas déjà : on ne
    // déplace pas le curseur d'un dialogue qui a posé son propre focus.
    if (!panel.contains(document.activeElement)) panel.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = focusableItems(panel);
      if (items.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;

      // Focus échappé du panneau (clic sur le fond, focus programmatique) :
      // la tabulation suivante le ramène à l'intérieur.
      if (!panel.contains(current)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }
      if (!e.shiftKey && current === last) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && (current === first || current === panel)) {
        e.preventDefault();
        last.focus();
      }
    };

    // En phase de capture : un `keydown` traité plus bas dans l'arbre ne peut
    // pas court-circuiter le confinement.
    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      // `isConnected` : après une suppression, le déclencheur a pu disparaître
      // du document avec la ligne qu'il commandait.
      if (opener?.isConnected) opener.focus();
    };
  }, [ref, active]);
}
