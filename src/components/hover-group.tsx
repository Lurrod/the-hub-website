"use client";

import { useRef, type ReactNode } from "react";

/**
 * Rangée horizontale à ressort : survoler un élément le soulève, ses voisins
 * suivent avec une atténuation par distance, et le retour rebondit.
 * Snippet `11-avatar-group-hover`. Les enfants doivent porter `.t-avatar`.
 *
 * La timing-function est posée en ligne AVANT l'écriture des variables :
 * le navigateur retient celle en vigueur au moment où la propriété change,
 * ce qui donne une courbe propre à la montée et un rebond au retour sans
 * seconde déclaration de transition.
 */
export default function HoverGroup({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  const setShifts = (activeIdx: number | null, phase: "in" | "out") => {
    if (!rootRef.current) return;
    const cs = getComputedStyle(document.documentElement);
    const num = (name: string, fb: number) => {
      const v = parseFloat(cs.getPropertyValue(name));
      return Number.isFinite(v) ? v : fb;
    };
    const ease = (name: string, fb: string) => cs.getPropertyValue(name).trim() || fb;

    const lift = num("--avatar-lift", -4);
    const falloff = num("--avatar-falloff", 0.45);
    const scale = num("--avatar-scale", 1.05);
    const tf =
      phase === "out"
        ? ease("--avatar-ease-out", "cubic-bezier(0.34, 3.85, 0.64, 1)")
        : ease("--avatar-ease-in", "cubic-bezier(0.22, 1, 0.36, 1)");

    rootRef.current.querySelectorAll<HTMLElement>(".t-avatar").forEach((el, i) => {
      el.style.transitionTimingFunction = tf;
      if (activeIdx == null) {
        el.style.setProperty("--shift", "0px");
        el.style.setProperty("--scale-active", "1");
        return;
      }
      const d = Math.abs(i - activeIdx);
      el.style.setProperty("--shift", (lift * Math.pow(falloff, d)).toFixed(3) + "px");
      el.style.setProperty("--scale-active", i === activeIdx ? String(scale) : "1");
    });
  };

  return (
    <div
      ref={rootRef}
      className={className}
      onMouseLeave={() => setShifts(null, "out")}
      onMouseOver={(e) => {
        const item = (e.target as HTMLElement).closest<HTMLElement>(".t-avatar");
        if (!item || !rootRef.current) return;
        const items = Array.from(rootRef.current.querySelectorAll<HTMLElement>(".t-avatar"));
        setShifts(items.indexOf(item), "in");
      }}
    >
      {children}
    </div>
  );
}
