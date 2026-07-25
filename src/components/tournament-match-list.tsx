import Link from "next/link";
import { dayKey, dayLabel, timeLabel } from "@/lib/dates";

type M = {
  id: string;
  date: Date | null;
  status: string;
  scoreA: number;
  scoreB: number;
  stageLabel: string;
  teamA: { name: string } | null;
  teamB: { name: string } | null;
};

/** Liste des matchs groupée par jour (séparateur à chaque changement de jour). */
export default function TournamentMatchList({ matches }: { matches: M[] }) {
  if (matches.length === 0) {
    return <p className="text-sm text-[var(--text-muted)]">Aucun match programmé.</p>;
  }

  const groups: { key: string; label: string; items: M[] }[] = [];
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
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            {g.label}
          </h3>
          <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-lg border border-[var(--border)]">
            {g.items.map((m) => {
              const played = m.status === "FINISHED" || m.status === "LIVE";
              return (
                <li key={m.id}>
                  <Link
                    href={`/matchs/${m.id}`}
                    className="flex items-center gap-3 bg-[var(--card)] px-3 py-2.5 transition-colors hover:bg-[var(--card-hover)]"
                  >
                    <div className="stat w-12 shrink-0 text-center text-sm text-white">
                      {timeLabel(m.date)}
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="truncate text-sm text-white">{m.teamA?.name ?? "—"}</div>
                      <div className="truncate text-sm text-white">{m.teamB?.name ?? "—"}</div>
                    </div>
                    <div className="w-8 shrink-0 space-y-0.5 text-center">
                      <div className="stat text-sm text-white">{played ? m.scoreA : "–"}</div>
                      <div className="stat text-sm text-white">{played ? m.scoreB : "–"}</div>
                    </div>
                    <div className="hidden w-28 shrink-0 text-right text-xs text-[var(--text-muted)] sm:block">
                      {m.stageLabel}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
