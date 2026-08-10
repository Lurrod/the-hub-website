import type { PlayerPoint } from "@/lib/data/tournament-stats";

const W = 480;
const H = 330;
const PAD = { top: 18, right: 20, bottom: 26, left: 38 };

/** Bornes d'un axe, toujours un peu plus larges que les données. */
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
 * des listes confondent. En haut à droite ceux qui fraguent en restant en vie ;
 * en bas à droite ceux qui font du dégât en se mettant en danger ; à gauche les
 * profils d'appui.
 *
 * Le SVG ne porte QUE les marques et les axes. Tous les textes sont posés en
 * HTML par-dessus : un `font-size` défini dans un SVG suit la mise à l'échelle
 * du viewBox, si bien que le même réglage donnait un texte énorme en desktop
 * (×2.25) et minuscule en mobile (×0.73). En HTML, 11px valent 11px partout.
 *
 * Une seule série, donc pas de boîte de légende et une seule teinte. Seuls les
 * trois meilleurs ratings sont nommés — un nom par point serait illisible.
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

  const xa = axis(
    pts.map((p) => p.acs),
    40
  );
  const ya = axis(
    pts.map((p) => p.kd),
    0.4
  );
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const x = (v: number) => PAD.left + ((v - xa.min) / (xa.max - xa.min)) * plotW;
  const y = (v: number) => PAD.top + (1 - (v - ya.min) / (ya.max - ya.min)) * plotH;
  /** Coordonnée du viewBox → pourcentage, pour poser le HTML au bon endroit. */
  const pctX = (v: number) => (x(v) / W) * 100;
  const pctY = (v: number) => (y(v) / H) * 100;

  const maxMaps = Math.max(...pts.map((p) => p.maps));
  const r = (maps: number) => 4 + (maxMaps > 1 ? (maps / maxMaps) * 4 : 4);

  const avgAcs = pts.reduce((n, p) => n + p.acs, 0) / pts.length;
  const named = [...pts].sort((a, b) => b.rating - a.rating).slice(0, 3);
  const isNamed = new Set(named.map((p) => p.playerId ?? p.name));

  // Noms poses SOUS leur point, avec un decalage cumule pour ceux qui se
  // suivent de pres en abscisse. Sous le point plutot que dessus : les trois
  // meilleurs ratings sont par construction en haut du graphe, ou une etiquette
  // au-dessus sortirait du cadre. Le decalage se calcule de proche en proche,
  // sinon un troisieme nom retomberait sur la ligne du premier.
  const byX = [...named].sort((a, b) => a.acs - b.acs);
  const tier = new Map<string, number>();
  byX.forEach((p, i) => {
    const prev = byX[i - 1];
    const close = prev != null && Math.abs(pctX(p.acs) - pctX(prev.acs)) < 22;
    const prevTier = prev ? (tier.get(prev.playerId ?? prev.name) ?? 0) : 0;
    tier.set(p.playerId ?? p.name, close ? prevTier + 1 : 0);
  });

  const xTicks = [xa.min, (xa.min + xa.max) / 2, xa.max].map((v) => Math.round(v));
  const yTicks = [ya.min, (ya.min + ya.max) / 2, ya.max].map((v) => Math.round(v * 10) / 10);

  const TICK =
    "pointer-events-none absolute text-[9px] leading-none text-[var(--text-subtle)] sm:text-[10px]";

  return (
    <figure className="m-0">
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full"
          role="img"
          aria-label={`Nuage de ${pts.length} joueurs, ACS de ${xTicks[0]} à ${xTicks[2]} en abscisse, K/D de ${yTicks[0]} à ${yTicks[2]} en ordonnée`}
        >
          {yTicks.map((t) => (
            <line
              key={`y${t}`}
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(t)}
              y2={y(t)}
              stroke="var(--border)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* Seuils : K/D 1.00 et ACS moyen du tournoi. Le pointillé leur est
              réservé — la grille reste en trait plein. */}
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

          {pts.map((p, i) => (
            <circle
              key={`${p.playerId ?? p.name}-${i}`}
              cx={x(p.acs)}
              cy={y(p.kd)}
              r={r(p.maps)}
              fill="var(--accent)"
              fillOpacity={isNamed.has(p.playerId ?? p.name) ? 1 : 0.55}
              stroke="var(--surface)"
              strokeWidth={2}
            >
              <title>
                {`${p.name}${p.teamTag ? ` · ${p.teamTag}` : ""} — ACS ${p.acs}, K/D ${p.kd.toFixed(2)}, rating ${p.rating.toFixed(2)} · ${p.maps} carte${p.maps > 1 ? "s" : ""}`}
              </title>
            </circle>
          ))}
        </svg>

        {/* Couche de texte : tailles CSS réelles, constantes à toutes les largeurs. */}
        {yTicks.map((t) => (
          <span
            key={`ly${t}`}
            className={`${TICK} -translate-y-1/2 text-right`}
            style={{ top: `${pctY(t)}%`, right: `${100 - (PAD.left / W) * 100 + 1.5}%` }}
          >
            {t.toFixed(1)}
          </span>
        ))}
        {xTicks.map((t) => (
          <span
            key={`lx${t}`}
            className={`${TICK} -translate-x-1/2`}
            style={{ left: `${pctX(t)}%`, top: `${((PAD.top + plotH + 8) / H) * 100}%` }}
          >
            {t}
          </span>
        ))}

        {named.map((p, i) => (
          <span
            key={`ln${p.playerId ?? p.name}-${i}`}
            className="pointer-events-none absolute -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold leading-none text-[var(--text)] sm:text-[11px]"
            style={{
              // Ramené dans le cadre : un joueur à l'extrême droite verrait
              // sinon son nom déborder.
              left: `${Math.min(Math.max(pctX(p.acs), 8), 92)}%`,
              top: `calc(${pctY(p.kd)}% + ${r(p.maps) + 6 + (tier.get(p.playerId ?? p.name) ?? 0) * 13}px)`,
            }}
          >
            {p.name}
          </span>
        ))}

        {/* Titres d'axes poses aux extremites : au centre ils mordaient sur la
            graduation mediane des le format mobile. */}
        <span className="pointer-events-none absolute bottom-0 right-0 text-[9px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
          ACS
        </span>
        <span className="pointer-events-none absolute left-0 top-0 text-[9px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
          K/D
        </span>
      </div>

      <figcaption className="mt-2 text-[11px] text-[var(--text-muted)]">
        Un point par joueur, taille selon les cartes jouées. Les pointillés marquent le K/D de 1.00
        et l&apos;ACS moyen du tournoi. Les trois meilleurs ratings sont nommés ; survolez un point
        pour le reste.
      </figcaption>
    </figure>
  );
}
