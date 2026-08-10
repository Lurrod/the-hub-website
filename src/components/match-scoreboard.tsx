"use client";

import { useEffect, useRef, useState } from "react";
import Segmented from "@/components/segmented";
import Link from "next/link";
import AgentIcon from "@/components/agent-icon";

export type RoundEntry = { w: "A" | "B"; o: string };

export type ScoreboardPlayerRow = {
  id: string;
  playerId: string | null;
  pseudo: string | null;
  riotName: string;
  teamSide: string; // "A" | "B"
  agent: string | null;
  kills: number;
  deaths: number;
  assists: number;
  acs: number;
  adr: number;
  rating: number;
  kast: number;
  firstKills: number;
  firstDeaths: number;
};

export type ScoreboardMap = {
  id: string;
  mapName: string;
  scoreA: number;
  scoreB: number;
  durationSec: number | null;
  rounds: RoundEntry[];
  stats: ScoreboardPlayerRow[];
};

/** Formate une durée en secondes → « 42:15 ». */
function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const OUTCOME_LABEL: Record<string, string> = {
  elim: "Élimination",
  detonate: "Spike explosé",
  defuse: "Spike désamorcé",
  time: "Temps écoulé",
};

const OUTCOMES = new Set(["elim", "detonate", "defuse", "time"]);

function OutcomeIcon({ o }: { o: string }) {
  const src = `/round/${OUTCOMES.has(o) ? o : "elim"}.png`;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img loading="lazy" decoding="async" src={src} alt="" className="h-3.5 w-3.5 object-contain" />
  );
}

function Crest({ url, tag, size }: { url: string | null; tag: string; size: string }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img loading="lazy" decoding="async" src={url} alt="" className={`${size} shrink-0 rounded object-cover`} />;
  }
  return (
    <span
      className={`${size} grid shrink-0 place-items-center rounded bg-[var(--surface)] text-[8px] text-[var(--text-muted)]`}
    >
      {tag.slice(0, 2).toUpperCase()}
    </span>
  );
}

function TrackRow({
  rounds,
  side,
  label,
  logo,
}: {
  rounds: RoundEntry[];
  side: "A" | "B";
  label: string;
  logo: string | null;
}) {
  const wonBg = side === "A" ? "bg-[#289a87]" : "bg-[#c05655]";
  return (
    <div className="flex items-center gap-2">
      <span className="flex w-20 shrink-0 items-center justify-end gap-1.5">
        <Crest url={logo} tag={label} size="h-4 w-4" />
        <span className="truncate text-[11px] font-medium text-[var(--text-muted)]">{label}</span>
      </span>
      <div className="flex gap-1">
        {rounds.map((r, i) => {
          const won = r.w === side;
          return (
            <span
              key={i}
              title={`Round ${i + 1} - ${won ? `${label} · ${OUTCOME_LABEL[r.o] ?? r.o}` : "perdu"}`}
              className={`grid h-6 w-6 shrink-0 place-items-center rounded ${
                won ? wonBg : "bg-[#131619]"
              }`}
            >
              {won ? <OutcomeIcon o={r.o} /> : null}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function RoundTimeline({
  rounds,
  teamAName,
  teamBName,
  teamATag,
  teamBTag,
  teamALogo,
  teamBLogo,
  scoreA,
  scoreB,
  durationSec,
}: {
  rounds: RoundEntry[];
  teamAName: string;
  teamBName: string;
  teamATag: string;
  teamBTag: string;
  teamALogo: string | null;
  teamBLogo: string | null;
  scoreA: number;
  scoreB: number;
  durationSec: number | null;
}) {
  if (rounds.length === 0) return null;
  return (
    <div className="mb-4">
      {/* Score + logos des équipes, au-dessus de la timeline */}
      <div className="mb-2 flex items-center justify-center gap-3 text-sm">
        <span className="flex max-w-[40%] items-center justify-end gap-2 text-white">
          <span className="truncate">{teamAName}</span>
          <Crest url={teamALogo} tag={teamATag} size="h-6 w-6" />
        </span>
        <span className="stat shrink-0 text-lg font-semibold text-white">
          <span className={scoreA > scoreB ? "text-[var(--accent)]" : ""}>{scoreA}</span>
          <span className="mx-1.5 text-[var(--text-subtle)]">-</span>
          <span className={scoreB > scoreA ? "text-[var(--accent)]" : ""}>{scoreB}</span>
        </span>
        <span className="flex max-w-[40%] items-center gap-2 text-white">
          <Crest url={teamBLogo} tag={teamBTag} size="h-6 w-6" />
          <span className="truncate">{teamBName}</span>
        </span>
      </div>

      {/* Durée de la partie (réelle si l'API l'a fournie, sinon estimée) */}
      <div className="mb-2 text-center text-[11px] text-[var(--text-muted)]">
        <span className="stat">
          {durationSec != null
            ? fmtDuration(durationSec)
            : `≈ ${Math.round((scoreA + scoreB) * 1.7)} min`}
        </span>
      </div>

      {/* Timeline en deux pistes, une par équipe, centrée. Elle est posée sur
          la surface de la carte, contrairement aux tableaux plus bas : elle
          garde donc le masque par défaut. */}
      <div className="scroll-x">
        <div className="mx-auto w-max space-y-1">
          <TrackRow rounds={rounds} side="A" label={teamATag} logo={teamALogo} />
          <TrackRow rounds={rounds} side="B" label={teamBTag} logo={teamBLogo} />
        </div>
      </div>
    </div>
  );
}

const HEAD = "px-1.5 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]";
const CELL = "stat px-1.5 py-1.5 text-center text-sm text-white";

function Diff({ value }: { value: number }) {
  const cls = value > 0 ? "text-[#289a87]" : value < 0 ? "text-[#c05655]" : "text-[var(--text-muted)]";
  return <span className={cls}>{value > 0 ? `+${value}` : value}</span>;
}

function TeamBlock({ rows }: { rows: ScoreboardPlayerRow[] }) {
  const sorted = [...rows].sort((a, b) => b.rating - a.rating);
  return (
    <div className="scroll-x scroll-x-on-bg">
      <table className="w-full min-w-[720px] table-fixed border-collapse">
        <colgroup>
          <col className="w-8" />
          <col />
          {Array.from({ length: 11 }).map((_, i) => (
            <col key={i} className="w-[48px]" />
          ))}
        </colgroup>
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th colSpan={2} scope="col" />
            <th scope="col" className={HEAD}>R</th>
            <th scope="col" className={HEAD}>ACS</th>
            <th scope="col" className={HEAD}>K</th>
            <th scope="col" className={HEAD}>D</th>
            <th scope="col" className={HEAD}>A</th>
            <th scope="col" className={HEAD}>+/−</th>
            <th scope="col" className={HEAD}>KAST</th>
            <th scope="col" className={HEAD}>ADR</th>
            <th scope="col" className={HEAD}>FK</th>
            <th scope="col" className={HEAD}>FD</th>
            <th scope="col" className={`${HEAD} pr-2`}>+/−</th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr>
              <td colSpan={13} className="px-2 py-2 text-left text-xs text-[var(--text-muted)]">
                Aucune donnée pour cette équipe.
              </td>
            </tr>
          )}
          {sorted.map((r) => (
            <tr key={r.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--table-row-hover)]">
              <td className="w-7 py-1.5 pl-2">
                <AgentIcon agent={r.agent} />
              </td>
              <td className="max-w-[130px] truncate py-1.5 pl-2 pr-2 text-left text-sm">
                {r.playerId ? (
                  <Link href={`/joueurs/${r.playerId}`} className="text-white hover:text-[var(--accent)]">
                    {r.pseudo ?? r.riotName}
                  </Link>
                ) : (
                  <span className="text-[var(--text-muted)]">{r.riotName}</span>
                )}
              </td>
              <td className={`${CELL} font-semibold ${r.rating >= 1 ? "text-white" : "text-[var(--text-muted)]"}`}>
                {r.rating.toFixed(2)}
              </td>
              <td className={CELL}>{r.acs}</td>
              <td className={CELL}>{r.kills}</td>
              <td className={CELL}>{r.deaths}</td>
              <td className={CELL}>{r.assists}</td>
              <td className={CELL}><Diff value={r.kills - r.deaths} /></td>
              <td className={CELL}>{r.kast}%</td>
              <td className={CELL}>{r.adr}</td>
              <td className={CELL}>{r.firstKills}</td>
              <td className={CELL}>{r.firstDeaths}</td>
              <td className={`${CELL} pr-2`}><Diff value={r.firstKills - r.firstDeaths} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MatchScoreboard({
  maps,
  teamAName,
  teamBName,
  teamATag,
  teamBTag,
  teamALogo,
  teamBLogo,
}: {
  maps: ScoreboardMap[];
  teamAName: string;
  teamBName: string;
  teamATag: string;
  teamBTag: string;
  teamALogo: string | null;
  teamBLogo: string | null;
}) {
  const [active, setActive] = useState(0);
  // Le panneau doit repasser par « fermé » avant de se rouvrir, sinon rien ne
  // transitionne au changement de carte.
  //
  // La remise à zéro se fait transition suspendue : sans ça, passer à
  // data-open="false" lance une transition VERS l'état fermé au lieu d'y sauter,
  // et la réouverture immédiate repart d'une valeur quasi inchangée — donc
  // aucune animation visible. Même précaution que la pastille de `Segmented`.
  const panelRef = useRef<HTMLDivElement>(null);
  // La page a déjà son animation d'entrée (`t-skel-in`) : rejouer le panneau au
  // premier paint superposerait deux entrées sur le même contenu. Il ne doit
  // s'animer qu'au CHANGEMENT de carte.
  const settled = useRef(false);
  useEffect(() => {
    if (!settled.current) {
      settled.current = true;
      return;
    }
    const el = panelRef.current;
    if (!el) return;
    const prev = el.style.transition;
    el.style.transition = "none";
    el.dataset.open = "false";
    void el.offsetWidth;
    el.style.transition = prev;
    el.dataset.open = "true";
  }, [active]);

  if (maps.length === 0) return null;
  const map = maps[Math.min(active, maps.length - 1)];

  return (
    // overflow-hidden : le panneau entre depuis 100px plus bas, il doit être
    // rogné par la carte pendant sa course au lieu de déborder sous sa bordure.
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      {maps.length > 1 && (
        <div className="border-b border-[var(--border)] px-2">
          <Segmented activeKey={String(active)} variant="underline">
            {maps.map((m, i) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setActive(i)}
                role="tab"
                aria-selected={i === active}
                className="t-tab shrink-0"
              >
                {m.mapName}
              </button>
            ))}
          </Segmented>
        </div>
      )}

      <div ref={panelRef} data-open="true" className="t-panel-slide p-4">
        <RoundTimeline
          rounds={map.rounds}
          teamAName={teamAName}
          teamBName={teamBName}
          teamATag={teamATag}
          teamBTag={teamBTag}
          teamALogo={teamALogo}
          teamBLogo={teamBLogo}
          scoreA={map.scoreA}
          scoreB={map.scoreB}
          durationSec={map.durationSec}
        />

        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-2">
          <TeamBlock rows={map.stats.filter((s) => s.teamSide === "A")} />
          <div className="my-2 h-px bg-[var(--border)]" />
          <TeamBlock rows={map.stats.filter((s) => s.teamSide === "B")} />
        </div>
      </div>
    </div>
  );
}
