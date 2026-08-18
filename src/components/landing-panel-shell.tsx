"use client";

import { useRef } from "react";

/**
 * Enveloppe interactive des maquettes de la landing : elle suit le curseur et
 * écrit sa position en variables CSS (`--lf-mx/--lf-my` pour le halo,
 * `--lf-rx/--lf-ry` pour l'inclinaison). Tout le rendu du survol reste en CSS
 * (`.lf-panel`, components.css) : sans JavaScript, les variables gardent leur
 * valeur par défaut et le panneau est simplement immobile — jamais cassé.
 *
 * Les écritures passent par `el.style` et non par un état React : un
 * `setState` par `pointermove` re-rendrait la maquette entière à chaque pixel
 * parcouru.
 */
export default function PanelShell({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  // Lue une fois par survol, pas à chaque mouvement : le réglage système ne
  // change pas pendant qu'on parcourt un panneau.
  const still = useRef(false);

  const onEnter = () => {
    still.current =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  };

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    // Le doigt déclenche aussi `pointermove` : sur écran tactile il n'y a pas
    // de survol, l'inclinaison ne ferait que trembler sous le scroll.
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    el.style.setProperty("--lf-mx", `${x.toFixed(0)}px`);
    el.style.setProperty("--lf-my", `${y.toFixed(0)}px`);
    if (still.current) return;
    // ±1,3° au maximum : l'inclinaison doit se sentir, pas se voir.
    el.style.setProperty("--lf-ry", `${((x / r.width - 0.5) * 2.6).toFixed(2)}deg`);
    el.style.setProperty("--lf-rx", `${((y / r.height - 0.5) * -2.6).toFixed(2)}deg`);
  };

  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    // On ne remet que l'inclinaison : le halo s'éteint en opacité via CSS et
    // peut rester où il était, un retour du curseur repartira du bon endroit.
    el.style.setProperty("--lf-rx", "0deg");
    el.style.setProperty("--lf-ry", "0deg");
  };

  return (
    <div
      ref={ref}
      onPointerEnter={onEnter}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className="lf-panel min-w-0 p-4 sm:p-5"
    >
      {/* Halo d'accent sous le curseur, au-dessus des nappes (::after) mais
          sous le contenu. Un vrai élément : les deux pseudo-éléments du cadre
          sont déjà pris. */}
      <span className="lf-glow" aria-hidden="true" />
      <div className="relative flex min-w-0 flex-col gap-3">{children}</div>
    </div>
  );
}
