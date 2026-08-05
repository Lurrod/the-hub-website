import Link from "next/link";
import { dayKey, dayLabel, timeLabel } from "@/lib/dates";

type Team = { name: string; logo: string | null } | null;
export type MatchEntry = {
  id: string;
  date: Date | null;
  hasTime?: boolean;
  status: string;
  scoreA: number;
  scoreB: number;
  stageLabel: string;
  teamA: Team;
  teamB: Team;
};

function TeamRow({ team }: { team: Team }) {
  return (
    <div className="flex items-center gap-2">
      {team?.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img loading="lazy" decoding="async" src={team.logo} alt="" className="h-5 w-5 shrink-0 rounded object-cover" />
      ) : (
        <div className="grid h-5 w-5 shrink-0 place-items-center rounded bg-[var(--surface)] text-[8px] text-[var(--text-muted)]">
          {team?.name?.slice(0, 2).toUpperCase() ?? "?"}
        </div>
      )}
      <span className="truncate text-sm text-white">{team?.name ?? "-"}</span>
    </div>
  );
}

/** Une ligne de match, réutilisable dans n'importe quelle liste groupée. */
export function MatchListItem({ m }: { m: MatchEntry }) {
  const played = m.status === "FINISHED" || m.status === "LIVE";
  return (
    <li>
      <Link
        href={`/matchs/${m.id}`}
        className="flex items-center gap-3 rounded px-3 py-2.5 transition-colors hover:bg-[var(--card-hover)]"
      >
        <div className="stat w-12 shrink-0 text-center text-sm text-white">{timeLabel(m.date, m.hasTime ?? false)}</div>
        <div className="min-w-0 max-w-[55%] space-y-1">
          <TeamRow team={m.teamA} />
          <TeamRow team={m.teamB} />
        </div>
        <div className="w-8 shrink-0 space-y-1 text-center">
          <div className="stat text-sm text-white">{played ? m.scoreA : "-"}</div>
          <div className="stat text-sm text-white">{played ? m.scoreB : "-"}</div>
        </div>
        <div className="ml-auto hidden shrink-0 pl-3 text-right text-xs text-[var(--text-muted)] sm:block">
          {m.stageLabel}
        </div>
      </Link>
    </li>
  );
}

/** Liste des matchs groupée par jour (séparateur à chaque changement de jour). */
export default function TournamentMatchList({ matches }: { matches: MatchEntry[] }) {
  if (matches.length === 0) {
    return <p className="text-sm text-[var(--text-muted)]">Aucun match programmé.</p>;
  }

  const groups: { key: string; label: string; items: MatchEntry[] }[] = [];
  for (const m of matches) {
    const k = dayKey(m.date);
    const last = groups[groups.length - 1];
    if (last && last.key === k) last.items.push(m);
    else groups.push({ key: k, label: dayLabel(m.date), items: [m] });
  }

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.key}>
          <div className="mb-2 rounded-lg bg-[#242832] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white">
            {g.label}
          </div>
          <ul className="divide-y divide-[var(--border)]">
            {g.items.map((m) => (
              <MatchListItem key={m.id} m={m} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
