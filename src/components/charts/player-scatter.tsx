import type { PlayerPoint } from "@/lib/data/tournament-stats";

// Ratio volontairement peu allonge : a 640x320 le nuage tombait sous 180px de
// haut sur un mobile de 390px, graduations illisibles. Le SVG garde son ratio,
// c'est donc le ratio qu'il faut regler.
const W = 480;
const H = 330;
const PAD = { top: 18, right: 20, bottom: 34, left: 44 };

/** Bornes d'un axe, arrondies et toujours un peu plus larges que les données. */
function axis(values: number[], pad: number) {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = Math.max(hi - lo, pad);
  return { min: Math.max(0, lo - span * 0.12), max: hi + span * 0.12 };
}

/**
 * Carte des joueurs du tournoi : ACS en abscisse, K/D en ordonnée, taille du
 * point = cartes jouées.
 *
 * Deux axes valent mieux qu'un classement ici : ils séparent des profils que
 * des listes ne distinguent pas. En haut à droite les joueurs qui fraguent
 * beaucoup en mourant peu ; en bas à droite ceux qui font du dégât mais se
 * mettent en danger ; à gauche les profils d'appui.
 *
 * Une seule série, donc pas de boîte de légende, et une seule teinte : les
 * points ne portent pas d'identité de catégorie. Seuls les trois meilleurs
 * ratings sont étiquetés — un nom sur chaque point serait illisible.
 */
export default function PlayerScatter({ players }: { players: PlayerPoint[] }) {
  const pts = players.filter((p) => p.maps > 0);
  if (pts.length < 3) {
    return (
      <p className="text-sm text-[var(--text-muted)]">
        Il faut au moins trois joueurs stattés pour dessiner la carte.
      </p>
    );
  }

  const xa = axis(pts.map((p) => p.acs), 40);
  const ya = axis(pts.map((p) => p.kd), 0.4);
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const x = (v: number) => PAD.left + ((v - xa.min) / (xa.max - xa.min)) * plotW;
  const y = (v: number) => PAD.top + (1 - (v - ya.min) / (ya.max - ya.min)) * plotH;

  const maxMaps = Math.max(...pts.map((p) => p.maps));
  const r = (maps: number) => 4 + (maxMaps > 1 ? (maps / maxMaps) * 4 : 4);

  const avgAcs = pts.reduce((n, p) => n + p.acs, 0) / pts.length;
  const named = [...pts].sort((a, b) => b.rating - a.rating).slice(0, 3);
  const isNamed = new Set(named.map((p) => p.playerId ?? p.name));

  const xTicks = [xa.min, (xa.min + xa.max) / 2, xa.max].map((v) => Math.round(v));
  const yTicks = [ya.min, (ya.min + ya.max) / 2, ya.max].map((v) => Math.round(v * 10) / 10);

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Nuage de ${pts.length} joueurs, ACS en abscisse de ${xTicks[0]} à ${xTicks[2]}, K/D en ordonnée de ${yTicks[0]} à ${yTicks[2]}`}
      >
        {yTicks.map((t) => (
          <g key={`y${t}`}>
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
              x={PAD.left - 7}
              y={y(t) + 3}
              textAnchor="end"
              className="fill-[var(--text-subtle)]"
              style={{ fontSize: "11px" }}
            >
              {t.toFixed(1)}
            </text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text
            key={`x${t}`}
            x={x(t)}
            y={H - PAD.bottom + 15}
            textAnchor="middle"
            className="fill-[var(--text-subtle)]"
            style={{ fontSize: "11px" }}
          >
            {t}
          </text>
        ))}

        {/* Repères : K/D 1.00 et ACS moyen du tournoi. Ce sont des seuils, pas
            une grille — d'où le pointillé. */}
        {ya.min < 1 && ya.max > 1 && (
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
        )}
        <line
          x1={x(avgAcs)}
          x2={x(avgAcs)}
          y1={PAD.top}
          y2={PAD.top + plotH}
          stroke="var(--text-subtle)"
          strokeWidth={1}
          strokeDasharray="4 4"
          vectorEffect="non-scaling-stroke"
        />

        {pts.map((p, i) => {
          const key = `${p.playerId ?? p.name}-${i}`;
          const cx = x(p.acs);
          const cy = y(p.kd);
          const big = isNamed.has(p.playerId ?? p.name);
          return (
            <g key={key}>
              <circle
                cx={cx}
                cy={cy}
                r={r(p.maps)}
                fill="var(--accent)"
                fillOpacity={big ? 1 : 0.55}
                stroke="var(--surface)"
                strokeWidth={2}
              />
              <title>
                {`${p.name}${p.teamTag ? ` · ${p.teamTag}` : ""} — ACS ${p.acs}, K/D ${p.kd.toFixed(2)}, rating ${p.rating.toFixed(2)} · ${p.maps} carte${p.maps > 1 ? "s" : ""}`}
              </title>
            </g>
          );
        })}

        {named.map((p, i) => (
          <text
            key={`n${p.playerId ?? p.name}-${i}`}
            /* Ramene dans le cadre : un joueur a l'extreme droite verrait sinon
               son nom deborder du SVG. */
            x={Math.min(Math.max(x(p.acs), PAD.left + 24), W - PAD.right - 24)}
            y={y(p.kd) - r(p.maps) - 5}
            textAnchor="middle"
            className="fill-[var(--text)]"
            style={{ fontSize: "12px", fontWeight: 600 }}
          >
            {p.name}
          </text>
        ))}

        <text
          x={PAD.left + plotW / 2}
          y={H - 2}
          textAnchor="middle"
          className="fill-[var(--text-muted)]"
          style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em" }}
        >
          ACS
        </text>
        <text
          x={12}
          y={PAD.top + plotH / 2}
          textAnchor="middle"
          transform={`rotate(-90 12 ${PAD.top + plotH / 2})`}
          className="fill-[var(--text-muted)]"
          style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em" }}
        >
          K/D
        </text>
      </svg>
      <figcaption className="mt-1 text-[11px] text-[var(--text-muted)]">
        Un point par joueur, taille selon les cartes jouées. Les pointillés marquent le K/D
        de 1.00 et l&apos;ACS moyen du tournoi. Les trois meilleurs ratings sont nommés ;
        survolez un point pour le reste.
      </figcaption>
    </figure>
  );
}
