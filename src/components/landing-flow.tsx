"use client";

import { useEffect, useRef, useState } from "react";

/**
 * L'ombre lumineuse de la vitrine : deux bandes d'accent floutées qui partent
 * de la première maquette, épousent les flancs gauche et droit de chacune, et
 * serpentent en courbes de Bézier jusqu'à la dernière — un continuum en fond
 * qui relie visuellement les blocs alternés, et dont la largeur respire
 * (`lf-flow-breathe`, components.css).
 *
 * Le tracé est mesuré au montage puis à chaque redimensionnement : les
 * maquettes alternent de colonne et changent de hauteur avec le contenu, un
 * tracé en dur serait faux au premier point de rupture. Purement décoratif :
 * sans JavaScript, il n'y a simplement pas de fil.
 */

type Rect = { x: number; y: number; w: number; h: number };

/**
 * Position par la chaîne `offsetParent`, pas par `getBoundingClientRect` :
 * l'apparition au défilement (`.lf-reveal`) translate les blocs pas encore
 * révélés, et le rectangle transformé décalerait le fil de 22 px sur tout le
 * bas de page. La position de layout, elle, ignore les transforms.
 */
function layoutRect(el: HTMLElement, host: HTMLElement): Rect {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== host) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

/** Un rail : descend le flanc de chaque maquette, courbe en S vers la suivante. */
function rail(rects: readonly Rect[], side: "left" | "right"): string {
  let d = "";
  rects.forEach((r, i) => {
    const x = side === "left" ? r.x : r.x + r.w;
    if (i === 0) d += `M ${x} ${r.y} `;
    d += `L ${x} ${r.y + r.h} `;
    const n = rects[i + 1];
    if (n) {
      const nx = side === "left" ? n.x : n.x + n.w;
      const my = (r.y + r.h + n.y) / 2;
      d += `C ${x} ${my}, ${nx} ${my}, ${nx} ${n.y} `;
    }
  });
  return d.trim();
}

export default function LandingFlow() {
  const ref = useRef<SVGSVGElement>(null);
  const [geom, setGeom] = useState<{ w: number; h: number; left: string; right: string } | null>(
    null
  );

  useEffect(() => {
    const host = ref.current?.parentElement;
    if (!host) return;

    const compute = () => {
      const targets = host.querySelectorAll<HTMLElement>(".lf-panel, .lf-dc");
      if (targets.length < 2) return;
      const rects = Array.from(targets, (t) => layoutRect(t, host));
      setGeom({
        w: host.offsetWidth,
        h: host.offsetHeight,
        left: rail(rects, "left"),
        right: rail(rects, "right"),
      });
    };

    compute();
    // Observer le conteneur suffit : tout reflow interne (fonte chargée,
    // colonne unique, largeur) change sa hauteur ou sa largeur.
    const observer = new ResizeObserver(compute);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  if (!geom) return <svg ref={ref} className="lf-flow" aria-hidden="true" />;

  return (
    <svg
      ref={ref}
      className="lf-flow"
      viewBox={`0 0 ${geom.w} ${geom.h}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {/* Durées et départs décalés entre les deux bandes : jamais en phase,
          la respiration paraît aléatoire. */}
      {[geom.left, geom.right].map((d, i) => (
        <path
          key={i}
          d={d}
          style={{ animationDuration: `${9 + i * 4}s`, animationDelay: `${i * -3}s` }}
        />
      ))}
    </svg>
  );
}
