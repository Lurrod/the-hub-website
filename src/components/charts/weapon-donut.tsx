import { donutSlices, polarPoint, ringSlicePath } from "@/lib/donut-core";
import { weaponIconUrl, weaponLabel } from "@/lib/weapons";
import type { WeaponMetaEntry } from "@/lib/data/tournament-stats";

const SIZE = 260;
const CENTER = SIZE / 2;
const R_OUT = 118;
const R_IN = 76;
const R_MID = (R_OUT + R_IN) / 2;
const ICON_R = 17;
const GAP_PX = 2;

/** Parts nommées affichées ; au-delà, tout tombe dans « Autres ». */
const TOP = 4;

/**
 * Ordre validé de la palette de viz (DESIGN.md §2.5) : c'est l'ordre
 * d'empilement qui décide des voisinages, ne pas réordonner sans refaire la
 * vérification. « Autres » reste neutre — ce n'est pas une cinquième
 * catégorie, c'est le reste.
 */
const SLICE_COLORS = ["var(--accent)", "var(--viz-blue)", "var(--viz-amber)", "var(--viz-green)"];
const AUTRES_COLOR = "var(--text-subtle)";

/**
 * Répartition des kills par arme, en anneau.
 *
 * Part-à-tout d'un coup d'œil, cinq parts au plus — même argument que
 * l'anneau des agents. Les armes n'ont pas de couleur officielle : la palette
 * de viz identifie les quatre premières, la silhouette sur la part et la
 * légende font le reste — l'identité ne repose jamais sur la seule couleur.
 */
export default function WeaponDonut({ meta }: { meta: WeaponMetaEntry[] }) {
  const total = meta.reduce((n, w) => n + w.kills, 0);
  if (total === 0) {
    return <p className="text-sm text-[var(--text-muted)]">Aucun kill à l&apos;arme enregistré.</p>;
  }

  const rest = meta.slice(TOP).reduce((n, w) => n + w.kills, 0);
  const parts = [
    ...meta.slice(0, TOP).map((w, i) => ({
      key: w.weapon,
      label: weaponLabel(w.weapon),
      icon: weaponIconUrl(w.weapon),
      kills: w.kills,
      pct: w.pct,
      color: SLICE_COLORS[i],
    })),
    ...(rest > 0
      ? [
          {
            key: "autres",
            label: `Autres (${meta.length - TOP})`,
            icon: null,
            kills: rest,
            pct: Math.round((rest / total) * 100),
            color: AUTRES_COLOR,
          },
        ]
      : []),
  ];

  const angles = donutSlices(
    parts.map((p) => p.kills),
    GAP_PX,
    R_MID
  );
  const slices = parts.map((p, i) => ({
    ...p,
    ...angles[i],
    showIcon: p.icon !== null && angles[i].sweep * R_MID >= ICON_R * 2 + 8,
  }));
  const single = parts.length === 1;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="h-auto w-full max-w-[260px] shrink-0"
        role="img"
        aria-label={`Répartition des ${total} kills à l'arme : ${parts
          .map((p) => `${p.label} ${p.pct} %`)
          .join(", ")}`}
      >
        {slices.map((s) => {
          const p = polarPoint(CENTER, s.mid, R_MID);
          return (
            <g key={s.key}>
              {single ? (
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r={R_MID}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={R_OUT - R_IN}
                />
              ) : (
                <path d={ringSlicePath(CENTER, R_OUT, R_IN, s.from, s.to)} fill={s.color} />
              )}

              {s.showIcon && (
                <>
                  <circle cx={p.x} cy={p.y} r={ICON_R} fill="var(--surface)" opacity={0.9} />
                  {/* `meet` et non `slice` : la silhouette est large et basse,
                      la rogner en carré n'en laisserait que la crosse. */}
                  <image
                    href={s.icon!}
                    x={p.x - ICON_R + 3}
                    y={p.y - ICON_R + 3}
                    width={(ICON_R - 3) * 2}
                    height={(ICON_R - 3) * 2}
                    preserveAspectRatio="xMidYMid meet"
                  />
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={ICON_R}
                    fill="none"
                    stroke="var(--surface)"
                    strokeWidth={2}
                  />
                </>
              )}
              <title>{`${s.label} — ${s.kills} kill${s.kills > 1 ? "s" : ""} (${s.pct} %)`}</title>
            </g>
          );
        })}

        <text
          x={CENTER}
          y={CENTER - 2}
          textAnchor="middle"
          className="fill-white"
          style={{ fontSize: "34px", fontWeight: 700 }}
        >
          {total.toLocaleString("fr-FR")}
        </text>
        <text
          x={CENTER}
          y={CENTER + 18}
          textAnchor="middle"
          className="fill-[var(--text-muted)]"
          style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em" }}
        >
          kills à l&apos;arme
        </text>
      </svg>

      {/* Légende : l'identité ne repose jamais sur la seule couleur. */}
      <ul className="flex w-full min-w-0 flex-col gap-2">
        {slices.map((s) => (
          <li key={s.key} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: s.color }}
              aria-hidden
            />
            <span className="truncate text-white">{s.label}</span>
            <span className="stat ml-auto shrink-0 font-semibold text-white">{s.pct} %</span>
            <span className="w-12 shrink-0 text-right text-[10px] text-[var(--text-muted)]">
              {s.kills} k.
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
