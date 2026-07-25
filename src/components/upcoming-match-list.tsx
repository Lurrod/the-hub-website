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

/** Colonne continue des matchs à venir : date/heure au-dessus, logo + tag,
    avec une lueur orange en fond de chaque match. */
export default function UpcomingMatchList({ matches }: { matches: M[] }) {
  if (matches.length === 0) {
    return <p className="text-sm text-[var(--text-muted)]">Aucun match à venir.</p>;
  }
  return (
    <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-lg border border-[var(--border)]">
      {matches.map((m) => (
        <li key={m.id}>
          <Link
            href={`/matchs/${m.id}`}
            className="relative isolate block px-3 py-2.5 transition-colors hover:bg-[var(--card-hover)]"
          >
            <div
              aria-hidden
              className="absolute inset-0 -z-10 bg-[radial-gradient(100%_120%_at_0%_50%,var(--accent-glow),transparent_65%)]"
            />
            <div className="mb-1.5 flex items-center gap-2 text-xs">
              <span className="stat text-white">{timeLabel(m.date)}</span>
              <span className="text-[var(--text-muted)]">{shortDate(m.date)}</span>
            </div>
            <div className="space-y-1">
              <TeamLine team={m.teamA} />
              <TeamLine team={m.teamB} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
