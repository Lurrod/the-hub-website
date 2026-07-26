"use client";

import { useState } from "react";
import Link from "next/link";
import AgentIcon from "@/components/agent-icon";

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
  hsPct: number;
};

export type ScoreboardMap = {
  id: string;
  mapName: string;
  scoreA: number;
  scoreB: number;
  stats: ScoreboardPlayerRow[];
};

const HEAD =
  "px-2 py-1.5 text-right text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]";
const CELL = "stat px-2 py-1.5 text-right text-sm text-white";

function TeamBlock({
  label,
  rounds,
  rows,
}: {
  label: string;
  rounds: number;
  rows: ScoreboardPlayerRow[];
}) {
  const sorted = [...rows].sort((a, b) => b.acs - a.acs);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="px-2 py-1.5 text-left text-sm font-semibold text-white" colSpan={2}>
              {label}
            </th>
            <th className={HEAD}>K</th>
            <th className={HEAD}>D</th>
            <th className={HEAD}>A</th>
            <th className={HEAD}>ACS</th>
            <th className={HEAD}>ADR</th>
            <th className={HEAD}>HS%</th>
            <th className={`${HEAD} pr-3 text-[var(--accent)]`}>{rounds}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr
              key={r.id}
              className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--table-row-hover)]"
            >
              <td className="w-8 py-1.5 pl-2">
                <AgentIcon agent={r.agent} />
              </td>
              <td className="max-w-[160px] truncate py-1.5 pr-2 text-left text-sm">
                {r.playerId ? (
                  <Link
                    href={`/joueurs/${r.playerId}`}
                    className="text-white hover:text-[var(--accent)]"
                  >
                    {r.pseudo ?? r.riotName}
                  </Link>
                ) : (
                  <span className="text-[var(--text-muted)]">{r.riotName}</span>
                )}
              </td>
              <td className={CELL}>{r.kills}</td>
              <td className={CELL}>{r.deaths}</td>
              <td className={CELL}>{r.assists}</td>
              <td className={CELL}>{r.acs}</td>
              <td className={CELL}>{r.adr}</td>
              <td className={CELL}>{r.hsPct}%</td>
              <td className={CELL}></td>
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
}: {
  maps: ScoreboardMap[];
  teamAName: string;
  teamBName: string;
}) {
  const [active, setActive] = useState(0);
  if (maps.length === 0) return null;
  const map = maps[Math.min(active, maps.length - 1)];

  return (
    <div>
      {maps.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {maps.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setActive(i)}
              aria-pressed={i === active}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                i === active
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-white"
                  : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)]"
              }`}
            >
              {m.mapName} {m.scoreA}–{m.scoreB}
            </button>
          ))}
        </div>
      )}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2">
        <TeamBlock label={teamAName} rounds={map.scoreA} rows={map.stats.filter((s) => s.teamSide === "A")} />
        <div className="my-2 h-px bg-[var(--border)]" />
        <TeamBlock label={teamBName} rounds={map.scoreB} rows={map.stats.filter((s) => s.teamSide === "B")} />
      </div>
    </div>
  );
}
