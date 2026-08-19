"use client";

import { useEffect, useRef, useState } from "react";

/**
 * L'ombre lumineuse de la vitrine : une bande d'accent floutée, unique et
 * immobile, qui part de la première maquette et serpente en courbes de Bézier
 * jusqu'à la dernière — un continuum en fond qui relie les blocs et dont la
 * largeur varie brutalement le long du tracé, comme une coulée irrégulière.
 *
 * Le tracé est mesuré au montage puis à chaque redimensionnement : les
 * maquettes changent de hauteur avec le contenu, un tracé en dur serait faux
 * au premier point de rupture. Purement décoratif : sans JavaScript, il n'y
 * a simplement pas de fil.
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

type Pt = { x: number; y: number };

/** Point d'une cubique de Bézier à u ∈ [0,1]. */
function bezier(p0: Pt, p1: Pt, p2: Pt, p3: Pt, u: number): Pt {
  const v = 1 - u;
  const a = v * v * v;
  const b = 3 * v * v * u;
  const c = 3 * v * u * u;
  const e = u * u * u;
  return {
    x: a * p0.x + b * p1.x + c * p2.x + e * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + e * p3.y,
  };
}

/**
 * Hachage déterministe → [0,1]. Pas de `Math.random` : la forme doit être la
 * même à chaque calcul, sinon le ruban sauterait à chaque redimensionnement.
 */
function hash(i: number): number {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Bruit de valeur lissé (interpolation smoothstep entre nœuds entiers). */
function noise(x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash(i) * (1 - u) + hash(i + 1) * u;
}

/**
 * Largeur de l'ombre le long du tracé, t ∈ [0,1] en abscisse curviligne.
 * Deux octaves de bruit de valeur : la première pose des masses franches,
 * la seconde ajoute des accidents. Bornes ~30–190 px avant flou — l'écart
 * entre un étranglement et un renflement doit se voir au premier regard.
 */
function widthAt(t: number): number {
  const n = 0.65 * noise(t * 11) + 0.35 * noise(t * 29 + 7.3);
  return 30 + 160 * n;
}

/**
 * Le ruban : traverse chaque maquette par son milieu, puis courbe en S vers
 * la suivante. La portion qui passe derrière une maquette disparaît sous sa
 * surface opaque — l'ombre ne se voit que dans les espaces entre les blocs.
 *
 * Un trait SVG a une largeur unique ; pour qu'elle varie le long du chemin,
 * on échantillonne le tracé, on décale chaque point de part et d'autre le
 * long de sa normale (différences finies), et on remplit le polygone obtenu.
 */
function ribbon(rects: readonly Rect[]): string {
  // Les maquettes alternent de colonne : passer par le milieu de chacune
  // suffit à faire serpenter le ruban d'un côté à l'autre de la page.
  const mid = (r: Rect) => r.x + r.w / 2;

  const samples: Pt[] = [];
  rects.forEach((r, i) => {
    const x = mid(r);
    for (let k = i === 0 ? 0 : 1; k <= 16; k++) samples.push({ x, y: r.y + (r.h * k) / 16 });
    const n = rects[i + 1];
    if (n) {
      const my = (r.y + r.h + n.y) / 2;
      const p0 = { x, y: r.y + r.h };
      const p3 = { x: mid(n), y: n.y };
      for (let k = 1; k <= 48; k++)
        samples.push(bezier(p0, { x, y: my }, { x: mid(n), y: my }, p3, k / 48));
    }
  });
  if (samples.length < 2) return "";

  // Abscisse curviligne cumulée, pour que le profil de largeur se déroule à
  // vitesse constante le long du fil et non par segment.
  const lengths = [0];
  for (let i = 1; i < samples.length; i++) {
    const dx = samples[i].x - samples[i - 1].x;
    const dy = samples[i].y - samples[i - 1].y;
    lengths.push(lengths[i - 1] + Math.hypot(dx, dy));
  }
  const total = lengths[lengths.length - 1] || 1;

  const left: string[] = [];
  const right: string[] = [];
  for (let i = 0; i < samples.length; i++) {
    const prev = samples[Math.max(0, i - 1)];
    const next = samples[Math.min(samples.length - 1, i + 1)];
    const len = Math.hypot(next.x - prev.x, next.y - prev.y) || 1;
    const nx = -(next.y - prev.y) / len;
    const ny = (next.x - prev.x) / len;
    const w = widthAt(lengths[i] / total) / 2;
    const p = samples[i];
    left.push(`${(p.x + nx * w).toFixed(1)} ${(p.y + ny * w).toFixed(1)}`);
    right.push(`${(p.x - nx * w).toFixed(1)} ${(p.y - ny * w).toFixed(1)}`);
  }
  return `M ${left.join(" L ")} L ${right.reverse().join(" L ")} Z`;
}

export default function LandingFlow() {
  const ref = useRef<SVGSVGElement>(null);
  const [geom, setGeom] = useState<{ w: number; h: number; d: string } | null>(null);

  useEffect(() => {
    const host = ref.current?.parentElement;
    if (!host) return;

    const compute = () => {
      const targets = host.querySelectorAll<HTMLElement>(".lf-panel, .lf-dc");
      if (targets.length < 2) return;
      const rects = Array.from(targets, (t) => layoutRect(t, host));
      setGeom({ w: host.offsetWidth, h: host.offsetHeight, d: ribbon(rects) });
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
      <path d={geom.d} />
    </svg>
  );
}
