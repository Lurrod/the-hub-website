import Link from "next/link";
import { shortDate, timeLabel } from "@/lib/dates";

type Team = { tag: string; logo: string | null } | null;
type M = { id: string; date: Date | null; teamA: Team; teamB: Team };

function TeamLine({ team }: { team: Team }) {
  return (
    <div className="flex items-center gap-2">
      {team?.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.logo} alt="" className="h-6 w-6 shrink-0 rounded object-cover" />
      ) : (
        <div className="grid h-6 w-6 shrink-0 place-items-center rounded bg-[var(--surface)] text-[9px] text-[var(--text-muted)]">
          {team?.tag?.slice(0, 3).toUpperCase() ?? "?"}
        </div>
      )}
      <span className="stat truncate text-sm text-white">{team?.tag ?? "—"}</span>
    </div>
  );
}

/** Liste verticale des matchs à venir : date/heure au-dessus, puis logo + tag. */
export default function UpcomingMatchList({ matches }: { matches: M[] }) {
  if (matches.length === 0) {
    return <p className="text-sm text-[var(--text-muted)]">Aucun match à venir.</p>;
  }
  return (
    <ul className="space-y-2">
      {matches.map((m) => (
        <li key={m.id}>
          <Link
            href={`/matchs/${m.id}`}
            className="card block p-3 transition-colors hover:border-[var(--border-strong)]"
          >
            <div className="mb-2 flex items-center justify-center gap-2 border-b border-[var(--border)] pb-2 text-center">
              <span className="stat text-sm text-white">{timeLabel(m.date)}</span>
              <span className="text-xs text-[var(--text-muted)]">{shortDate(m.date)}</span>
            </div>
            <div className="space-y-1.5">
              <TeamLine team={m.teamA} />
              <TeamLine team={m.teamB} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
