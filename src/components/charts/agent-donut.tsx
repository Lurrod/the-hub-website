import { agentColor, agentIconUrl } from "@/lib/agents";
import type { AgentShare } from "@/lib/player-overview-core";

const SIZE = 260;
const CENTER = SIZE / 2;
const R_OUT = 118;
const R_IN = 76;
const R_MID = (R_OUT + R_IN) / 2;
const ICON_R = 17;
/** Espace de surface entre deux parts : jamais un contour tracé autour des parts. */
const GAP_PX = 2;

/** Point du cercle à un angle donné, 0 = midi, sens horaire. */
function polar(angle: number, radius: number) {
  const a = angle - Math.PI / 2;
  return { x: CENTER + radius * Math.cos(a), y: CENTER + radius * Math.sin(a) };
}

/** Chemin d'une part d'anneau entre deux angles. */
function arc(from: number, to: number): string {
  const large = to - from > Math.PI ? 1 : 0;
  const o1 = polar(from, R_OUT);
  const o2 = polar(to, R_OUT);
  const i2 = polar(to, R_IN);
  const i1 = polar(from, R_IN);
  return [
    `M${o1.x},${o1.y}`,
    `A${R_OUT},${R_OUT} 0 ${large} 1 ${o2.x},${o2.y}`,
    `L${i2.x},${i2.y}`,
    `A${R_IN},${R_IN} 0 ${large} 0 ${i1.x},${i1.y}`,
    "Z",
  ].join(" ");
}

/**
 * Répartition des agents joués, en anneau.
 *
 * Part-à-tout d'un coup d'œil, six parts au plus : le seul cas où l'anneau bat
 * la barre. Le total est au centre plutôt que sur les parts.
 *
 * Chaque part porte le portrait de son agent, et la légende répète nom et
 * nombre de cartes. C'est indispensable : les couleurs officielles Riot sont
 * très proches d'un agent à l'autre (voir `AGENT_COLORS`), elles ne peuvent
 * pas identifier une part à elles seules.
 */
export default function AgentDonut({
  agents,
  totalMaps,
}: {
  agents: AgentShare[];
  totalMaps: number;
}) {
  const total = agents.reduce((n, a) => n + a.maps, 0);
  if (total === 0) {
    return <p className="text-sm text-[var(--text-muted)]">Aucun agent enregistré.</p>;
  }

  const gapAngle = GAP_PX / R_MID;
  const single = agents.length === 1;

  // Décalage angulaire de chaque part : somme des parts qui la précèdent.
  const offsets = agents.reduce<number[]>(
    (acc, a) => [...acc, acc[acc.length - 1] + (a.maps / total) * Math.PI * 2],
    [0]
  );

  const slices = agents.map((a, i) => {
    const from = offsets[i];
    const to = offsets[i + 1];
    const sweep = to - from;
    // Une part unique fait le tour complet : lui retirer un espace laisserait
    // une encoche sans raison.
    const half = single ? 0 : gapAngle / 2;
    const mid = (from + to) / 2;
    return {
      ...a,
      from: from + half,
      to: to - half,
      mid,
      // Le portrait n'est posé que si la part est assez large pour l'accueillir.
      showIcon: sweep * R_MID >= ICON_R * 2 + 8,
      color: agentColor(a.agent),
    };
  });

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="h-auto w-full max-w-[260px] shrink-0"
        role="img"
        aria-label={`Répartition des agents joués sur ${totalMaps} cartes : ${agents
          .map((a) => `${a.agent} ${a.pct} %`)
          .join(", ")}`}
      >
        <defs>
          {slices.map((s) => (
            <clipPath key={s.agent} id={`agent-clip-${s.agent.replace(/\W/g, "")}`}>
              <circle cx={polar(s.mid, R_MID).x} cy={polar(s.mid, R_MID).y} r={ICON_R} />
            </clipPath>
          ))}
        </defs>

        {slices.map((s) => {
          const p = polar(s.mid, R_MID);
          const icon = agentIconUrl(s.agent);
          const clip = `url(#agent-clip-${s.agent.replace(/\W/g, "")})`;
          return (
            <g key={s.agent}>
              {single ? (
                <>
                  <circle cx={CENTER} cy={CENTER} r={(R_OUT + R_IN) / 2} fill="none"
                    stroke={s.color} strokeWidth={R_OUT - R_IN} />
                </>
              ) : (
                <path d={arc(s.from, s.to)} fill={s.color} />
              )}

              {s.showIcon && (
                <>
                  {/* Pastille de la couleur de l'agent : le portrait garde un fond
                      même quand son image est transparente. */}
                  <circle cx={p.x} cy={p.y} r={ICON_R} fill={s.color} />
                  {icon && (
                    <image
                      href={icon}
                      x={p.x - ICON_R}
                      y={p.y - ICON_R}
                      width={ICON_R * 2}
                      height={ICON_R * 2}
                      clipPath={clip}
                      preserveAspectRatio="xMidYMid slice"
                    />
                  )}
                  {/* Anneau de surface : détache la pastille de la part. */}
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
              <title>{`${s.agent} — ${s.maps} carte${s.maps > 1 ? "s" : ""} (${s.pct} %)`}</title>
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
          {totalMaps}
        </text>
        <text
          x={CENTER}
          y={CENTER + 18}
          textAnchor="middle"
          className="fill-[var(--text-muted)]"
          style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em" }}
        >
          {totalMaps > 1 ? "cartes" : "carte"}
        </text>
      </svg>

      {/* Légende : l'identité ne repose jamais sur la seule couleur. */}
      <ul className="flex w-full min-w-0 flex-col gap-2">
        {slices.map((s) => (
          <li key={s.agent} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: s.color }}
              aria-hidden
            />
            <span className="truncate text-white">{s.agent}</span>
            <span className="stat ml-auto shrink-0 font-semibold text-white">{s.pct} %</span>
            <span className="w-12 shrink-0 text-right text-[10px] text-[var(--text-muted)]">
              {s.maps} c.
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
