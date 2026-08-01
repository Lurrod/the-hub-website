import Link from "next/link";
import type { ReactNode } from "react";
import AgentIcon from "@/components/agent-icon";
import type { PlayerMatchDay, PlayerMapRow, TeamAgents } from "@/lib/data/player-matches";

const WIN = "#289a87";
const LOSS = "#c05655";
const BANNER = "#242832";

function fmtDuration(sec: number): string {
  const totalMin = Math.round(sec / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${m} min`;
}

function fmtDay(date: Date | null): string {
  if (!date) return "Date inconnue";
  return new Date(date).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function Crest({ logo, tag, size = "h-6 w-6" }: { logo: string | null; tag: string; size?: string }) {
  if (logo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img loading="lazy" decoding="async" src={logo} alt="" className={`${size} shrink-0 rounded object-cover`} />;
  }
  return (
    <span className={`${size} grid shrink-0 place-items-center rounded bg-[var(--bg)] text-[9px] text-[var(--text-muted)]`}>
      {tag.slice(0, 2).toUpperCase()}
    </span>
  );
}

function TeamStrip({ team, highlight }: { team: TeamAgents | null; highlight: boolean }) {
  if (!team) return null;
  return (
    <div className="flex items-center gap-1.5">
      <Crest logo={team.logo} tag={team.tag} size="h-5 w-5" />
      <span
        className={`stat w-9 shrink-0 text-[11px] ${highlight ? "font-semibold text-white" : "text-[var(--text-muted)]"}`}
      >
        {team.tag}
      </span>
      <div className="flex gap-0.5">
        {team.agents.map((a, i) => (
          <AgentIcon key={i} agent={a} className="h-4 w-4" />
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="w-16 shrink-0 text-center">
      <div className="text-[9px] uppercase tracking-wide text-[var(--text-muted)]">{label}</div>
      <div className={`stat text-sm ${strong ? "font-semibold text-[var(--accent)]" : "text-white"}`}>{value}</div>
    </div>
  );
}

function DayBanner({ d }: { d: PlayerMatchDay }) {
  return (
    <div
      className="flex items-center justify-between gap-3 px-3 py-2"
      style={{ backgroundColor: BANNER }}
    >
      <div className="stat text-sm font-semibold text-white">{fmtDay(d.date)}</div>
      <div className="flex min-w-0 items-center gap-2">
        <Crest logo={d.tournament.logo} tag={d.tournament.name} size="h-6 w-6" />
        <span className="truncate text-xs font-medium text-white">{d.tournament.name}</span>
        <span className="shrink-0 text-[11px] text-[var(--text-muted)]">
          {d.stage} · BO{d.bestOf}
        </span>
      </div>
    </div>
  );
}

function MapRow({ mp }: { mp: PlayerMapRow }) {
  const color = mp.win ? WIN : LOSS;
  return (
    <Link
      href={`/matchs/${mp.matchId}`}
      className="flex items-center gap-4 overflow-x-auto px-3 py-2.5 transition-colors hover:bg-[var(--table-row-hover)]"
    >
      <AgentIcon agent={mp.agent} className="h-10 w-10" />

      <div className="w-20 shrink-0">
        <div className="text-sm font-bold" style={{ color }}>
          {mp.win ? "Victoire" : "Défaite"}
        </div>
        <div className="stat text-[11px] text-[var(--text-muted)]">{fmtDuration(mp.durationSec)}</div>
      </div>

      {/* Map avant le score */}
      <div className="w-20 shrink-0 truncate text-sm font-medium text-white">{mp.mapName}</div>

      <div className="stat w-14 shrink-0 text-sm">
        <span style={{ color }} className="font-bold">
          {mp.myScore}
        </span>
        <span className="mx-1 text-[var(--text-subtle)]">-</span>
        <span className="text-[var(--text-muted)]">{mp.oppScore}</span>
      </div>

      <div className="flex w-28 shrink-0 items-center gap-1.5">
        <span className="text-[11px] text-[var(--text-subtle)]">vs</span>
        {mp.opponent && <Crest logo={mp.opponent.logo} tag={mp.opponent.tag} size="h-5 w-5" />}
        <span className="truncate text-xs text-white">{mp.opponent?.tag ?? "-"}</span>
      </div>

      <div className="flex shrink-0 items-center">
        <Stat label="Rating" value={mp.rating.toFixed(2)} />
        <Stat label="ACS" value={`${mp.acs}`} />
        <Stat label="K/D/A" value={`${mp.kills}/${mp.deaths}/${mp.assists}`} />
        <Stat label="KAST" value={`${mp.kast}%`} />
      </div>

      <div className="ml-auto flex shrink-0 flex-col gap-1 pl-2">
        <TeamStrip team={mp.teamA} highlight={mp.playerTeamId === mp.teamA?.id} />
        <TeamStrip team={mp.teamB} highlight={mp.playerTeamId === mp.teamB?.id} />
      </div>
    </Link>
  );
}

export default function PlayerMatches({ days }: { days: PlayerMatchDay[] }) {
  if (days.length === 0) {
    return <p className="text-[var(--text-muted)]">Aucun match joué pour le moment.</p>;
  }

  // Tout dans une seule zone : les bandeaux date+tournoi font les séparations.
  const rows: ReactNode[] = [];
  for (const d of days) {
    rows.push(<DayBanner key={`b-${d.key}`} d={d} />);
    d.maps.forEach((mp, i) => rows.push(<MapRow key={`${d.key}-${mp.matchId}-${i}`} mp={mp} />));
  }

  return (
    <div
      className="divide-y divide-[var(--border)] overflow-hidden rounded-lg border border-[var(--border)]"
      style={{ backgroundColor: "#191c22" }}
    >
      {rows}
    </div>
  );
}
