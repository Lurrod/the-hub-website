"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";

/**
 * Barre d'options à choix unique, avec la pastille coulissante du snippet
 * `16-tabs-sliding`. Les options restent fournies par l'appelant : il suffit
 * qu'elles portent `.t-tab` et `aria-selected`.
 *
 * `activeKey` déclenche le déplacement. Au premier rendu la pastille est
 * posée sans transition, sinon elle arriverait depuis translate(0) / width 0.
 *
 * Variante `underline` : la pastille est stylée en trait accent (onglets de
 * tournoi, menu d'étapes) plutôt qu'en fond plein.
 */
export default function Segmented({
  activeKey,
  variant = "pill",
  className,
  children,
}: {
  activeKey: string;
  variant?: "pill" | "underline";
  className?: string;
  children: ReactNode;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const settled = useRef(false);

  const move = useCallback(
    (animate: boolean) => {
      const bar = barRef.current;
      const pill = pillRef.current;
      if (!bar || !pill) return;
      const tab =
        bar.querySelector<HTMLElement>('.t-tab[aria-selected="true"]') ??
        bar.querySelector<HTMLElement>(".t-tab");
      if (!tab) return;

      const write = () => {
        // offsetTop en plus du offsetLeft du snippet : les options peuvent
        // passer à la ligne, la pastille doit suivre.
        pill.style.transform = `translate(${tab.offsetLeft}px, ${tab.offsetTop}px)`;
        pill.style.width = `${tab.offsetWidth}px`;
        if (variant === "pill") pill.style.height = `${tab.offsetHeight}px`;
      };

      if (animate) {
        write();
        return;
      }
      const prev = pill.style.transition;
      pill.style.transition = "none";
      write();
      void pill.offsetWidth;
      pill.style.transition = prev;
    },
    [variant]
  );

  useEffect(() => {
    const animate = settled.current;
    settled.current = true;
    // Les polices peuvent encore charger au premier paint : on mesure au
    // frame suivant pour ne pas figer une largeur périmée.
    const raf = requestAnimationFrame(() => move(animate));
    return () => cancelAnimationFrame(raf);
  }, [activeKey, move]);

  useEffect(() => {
    const onResize = () => move(false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [move]);

  return (
    <div
      ref={barRef}
      role="tablist"
      data-variant={variant}
      className={`t-tabs ${className ?? ""}`}
    >
      <span ref={pillRef} className="t-tabs-pill" aria-hidden="true" />
      {children}
    </div>
  );
}
