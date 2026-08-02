"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

type Line = { x: number; y: number; w: number; h: number };

const ANCHORS = ["upper-final", "lower-final", "grand-final"] as const;

/**
 * Trace les liaisons « finale upper + finale lower → grande finale » d'un
 * tableau à double élimination.
 *
 * Ces trois cartes vivent dans des blocs de hauteurs différentes : aucune règle
 * CSS ne peut exprimer la position de l'une par rapport à l'autre. On mesure
 * donc le DOM via les attributs `data-bracket-anchor`. Sans JavaScript le
 * bracket reste lisible, il perd seulement les trois traits.
 */
export default function BracketGrandFinalLines({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<Line[]>([]);

  const measure = useCallback(() => {
    const root = ref.current;
    if (!root) return;

    const found = ANCHORS.map((name) => root.querySelector(`[data-bracket-anchor="${name}"]`));
    if (found.some((el) => el == null)) {
      setLines([]);
      return;
    }

    // Coordonnées relatives au conteneur : il porte le défilement horizontal,
    // les écarts entre rectangles restent donc justes quel que soit le scroll.
    const base = root.getBoundingClientRect();
    const box = (el: Element) => {
      const b = el.getBoundingClientRect();
      return {
        left: b.left - base.left,
        right: b.right - base.left,
        mid: b.top - base.top + b.height / 2,
      };
    };
    const [upper, lower, grand] = found.map((el) => box(el!));

    // Tronc vertical : juste à gauche de la grande finale, mais toujours à
    // droite des deux finales, même si l'un des tableaux est plus large.
    const trunk = Math.max(grand.left - 20, upper.right + 12, lower.right + 12);
    const top = Math.min(upper.mid, lower.mid);
    const bottom = Math.max(upper.mid, lower.mid);

    setLines([
      { x: upper.right, y: upper.mid, w: Math.max(0, trunk - upper.right), h: 1 },
      { x: lower.right, y: lower.mid, w: Math.max(0, trunk - lower.right), h: 1 },
      { x: trunk, y: top, w: 1, h: bottom - top },
      { x: trunk, y: grand.mid, w: Math.max(0, grand.left - trunk), h: 1 },
    ]);
  }, []);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    measure();
    // Recalcule sur redimensionnement du bloc (fenêtre, chargement des polices,
    // changement d'onglet qui remonte le contenu).
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [measure]);

  return (
    <div ref={ref} className="relative w-max">
      {children}
      {lines.map((l, i) => (
        <span
          key={i}
          aria-hidden
          className="pointer-events-none absolute bg-[var(--border-strong)]"
          style={{ left: l.x, top: l.y, width: l.w, height: l.h }}
        />
      ))}
    </div>
  );
}
