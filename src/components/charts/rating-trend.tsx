import type { TrendPoint } from "@/lib/player-overview-core";

// Format volontairement peu allonge : a 600x170 la courbe tombait a ~90px de
// haut sur un mobile de 360px et devenait illisible. Le SVG garde son ratio,
// c'est donc le ratio lui-meme qu'il faut regler.
const W = 460;
const H = 175;
// La marge droite loge l'étiquette de fin de courbe sans qu'elle déborde.
const PAD = { top: 14, right: 42, bottom: 18, left: 30 };

/** Bornes de l'axe : toujours 1.00 dans le cadre, sinon le repère sort du graphe. */
function domain(values: number[]): { min: number; max: number } {
  const lo = Math.min(1, ...values);
  const hi = Math.max(1, ...values);
  const pad = Math.max((hi - lo) * 0.15, 0.1);
  return { min: Math.max(0, lo - pad), max: hi + pad };
}

/**
 * Évolution du rating carte après carte.
 *
 * Une seule série, donc pas de boîte de légende : le titre dit déjà ce qui est
 * tracé. Les valeurs ne sont pas écrites sur chaque point — seuls la dernière
 * carte et la meilleure sont étiquetées, le reste se lit sur l'axe et au survol.
 * Le trait à 1.00 est un seuil (la performance moyenne), pas une grille : c'est
 * la seule ligne en pointillé du graphe.
 */
export default function RatingTrend({ points }: { points: TrendPoint[] }) {
  if (points.length < 2) {
    return (
      <p className="text-sm text-[var(--text-muted)]">
        Il faut au moins deux cartes jouées pour tracer une évolution.
      </p>
    );
  }

  const values = points.map((p) => p.rating);
  const { min, max } = domain(values);
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const x = (i: number) => PAD.left + (i / (points.length - 1)) * plotW;
  const y = (v: number) => PAD.top + (1 - (v - min) / (max - min)) * plotH;

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.rating)}`).join(" ");
  const area = `${line} L${x(points.length - 1)},${PAD.top + plotH} L${x(0)},${PAD.top + plotH} Z`;

  const bestIdx = values.reduce((b, v, i) => (v > values[b] ? i : b), 0);
  const lastIdx = points.length - 1;
  const marked = [...new Set([bestIdx, lastIdx])];

  // Graduations rondes : elles portent les valeurs qu'on n'étiquette pas.
  const ticks = [min, (min + max) / 2, max].map((v) => Math.round(v * 10) / 10);

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Rating sur les ${points.length} dernières cartes, de ${Math.min(...values).toFixed(2)} à ${Math.max(...values).toFixed(2)}`}
      >
        {/* Grille : pleine, d'un cran sur la surface, en retrait. */}
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(t)}
              y2={y(t)}
              stroke="var(--border)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={PAD.left - 6}
              y={y(t) + 3}
              textAnchor="end"
              className="fill-[var(--text-subtle)]"
              style={{ fontSize: "10px" }}
            >
              {t.toFixed(1)}
            </text>
          </g>
        ))}

        {/* Seuil : la performance moyenne. */}
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={y(1)}
          y2={y(1)}
          stroke="var(--text-subtle)"
          strokeWidth={1}
          strokeDasharray="4 4"
          vectorEffect="non-scaling-stroke"
        />

        <path d={area} fill="var(--accent)" opacity={0.1} />
        <path
          d={line}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {marked.map((i) => (
          <circle
            key={i}
            cx={x(i)}
            cy={y(points[i].rating)}
            r={4}
            fill="var(--accent)"
            stroke="var(--surface)"
            strokeWidth={2}
          />
        ))}

        {/* Étiquette de la dernière carte, posée après le point et non dessus. */}
        <text
          x={x(lastIdx) + 9}
          y={y(points[lastIdx].rating) + 3}
          textAnchor="start"
          className="fill-[var(--text)]"
          style={{ fontSize: "11px", fontWeight: 600 }}
        >
          {points[lastIdx].rating.toFixed(2)}
        </text>

        {/* Cibles de survol : plus larges que les points, pour être atteignables. */}
        {points.map((p, i) => (
          <rect
            key={p.matchId + i}
            x={x(i) - plotW / (points.length - 1) / 2}
            y={PAD.top}
            width={plotW / (points.length - 1)}
            height={plotH}
            fill="transparent"
          >
            <title>{`${p.label} — rating ${p.rating.toFixed(2)} · ${p.win ? "victoire" : "défaite"}`}</title>
          </rect>
        ))}
      </svg>
      <figcaption className="mt-1 text-[11px] text-[var(--text-muted)]">
        De la plus ancienne à la plus récente. Le trait en pointillé marque 1.00, la performance
        moyenne.
      </figcaption>
    </figure>
  );
}
