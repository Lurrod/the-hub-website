/**
 * Géométrie d'un anneau (donut). Extraite d'AgentDonut au moment d'ajouter un
 * second anneau (les armes) : la trigonométrie des parts n'a pas à vivre en
 * double dans deux composants.
 */

export type DonutSlice = {
  from: number;
  to: number;
  /** Milieu angulaire de la part, pour y poser pastille ou étiquette. */
  mid: number;
  /** Ouverture réelle (espace déduit), pour décider si une icône tient. */
  sweep: number;
};

/** Point du cercle à un angle donné, 0 = midi, sens horaire. */
export function polarPoint(
  center: number,
  angle: number,
  radius: number
): { x: number; y: number } {
  const a = angle - Math.PI / 2;
  return { x: center + radius * Math.cos(a), y: center + radius * Math.sin(a) };
}

/** Chemin SVG d'une part d'anneau entre deux angles. */
export function ringSlicePath(
  center: number,
  rOut: number,
  rIn: number,
  from: number,
  to: number
): string {
  const large = to - from > Math.PI ? 1 : 0;
  const o1 = polarPoint(center, from, rOut);
  const o2 = polarPoint(center, to, rOut);
  const i2 = polarPoint(center, to, rIn);
  const i1 = polarPoint(center, from, rIn);
  return [
    `M${o1.x},${o1.y}`,
    `A${rOut},${rOut} 0 ${large} 1 ${o2.x},${o2.y}`,
    `L${i2.x},${i2.y}`,
    `A${rIn},${rIn} 0 ${large} 0 ${i1.x},${i1.y}`,
    "Z",
  ].join(" ");
}

/**
 * Angles des parts au prorata des valeurs, un espace de surface entre deux
 * parts (`gapPx` rapporté au rayon médian — jamais un contour). Une part
 * unique fait le tour complet : lui retirer un espace laisserait une encoche
 * sans raison.
 */
export function donutSlices(values: readonly number[], gapPx: number, rMid: number): DonutSlice[] {
  const total = values.reduce((n, v) => n + v, 0);
  if (total <= 0) return values.map(() => ({ from: 0, to: 0, mid: 0, sweep: 0 }));

  const single = values.filter((v) => v > 0).length === 1;
  const half = single ? 0 : gapPx / rMid / 2;

  const offsets = values.reduce<number[]>(
    (acc, v) => [...acc, acc[acc.length - 1] + (v / total) * Math.PI * 2],
    [0]
  );
  return values.map((v, i) => {
    // Une part vide reste un point : l'espace ne doit pas la rendre négative.
    const pad = v > 0 ? half : 0;
    const from = offsets[i] + pad;
    const to = offsets[i + 1] - pad;
    return { from, to, mid: (offsets[i] + offsets[i + 1]) / 2, sweep: Math.max(0, to - from) };
  });
}
