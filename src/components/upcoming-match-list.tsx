import Link from "next/link";
import { shortDate, timeLabel } from "@/lib/dates";

type M = {
  id: string;
  date: Date | null;
  teamA: { name: string } | null;
  teamB: { name: string } | null;
};

/** Liste verticale compacte des matchs à venir (heure/date + 2 équipes empilées). */
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
            className="card flex gap-3 p-3 transition-colors hover:border-[var(--border-strong)]"
          >
            <div className="w-14 shrink-0 text-center">
              <div className="stat text-sm text-white">{timeLabel(m.date)}</div>
              <div className="text-[10px] text-[var(--text-muted)]">{shortDate(m.date)}</div>
            </div>
            <div className="min-w-0 flex-1 space-y-1 border-l border-[var(--border)] pl-3">
              <div className="truncate text-sm text-white">{m.teamA?.name ?? "À déterminer"}</div>
              <div className="truncate text-sm text-white">{m.teamB?.name ?? "À déterminer"}</div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
