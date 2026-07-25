import Link from "next/link";
import { countdownLabel } from "@/lib/dates";

type Row = {
  id: string;
  name: string;
  logo: string | null;
  startDate: Date | null;
  prizePool: string | null;
  teamCount: number;
  days: number | null;
};

function fullDate(date: Date | null): string {
  if (!date) return "Date à définir";
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function TournamentListRow({ t }: { t: Row }) {
  return (
    <Link
      href={`/tournois/${t.id}`}
      className="card flex items-center gap-4 p-3 transition-colors hover:border-[var(--border-strong)]"
    >
      <div className="w-16 shrink-0 sm:w-24">
        <span className="stat block text-center text-sm font-semibold text-[var(--accent)]">
          {countdownLabel(t.days)}
        </span>
      </div>

      {t.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={t.logo} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
      ) : (
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-[var(--surface)] text-xs text-[var(--text-muted)]">
          {t.name.slice(0, 2).toUpperCase()}
        </div>
      )}

      <div className="min-w-0">
        <div className="truncate font-semibold text-white">{t.name}</div>
        <div className="text-xs text-[var(--text-muted)]">{fullDate(t.startDate)}</div>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-5 sm:gap-8">
        <div className="text-right">
          <div className="stat text-base text-white">{t.teamCount}</div>
          <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">équipes</div>
        </div>
        <div className="text-right">
          <div className="stat text-base text-white">{t.prizePool ?? "—"}</div>
          <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
            cash prize
          </div>
        </div>
      </div>
    </Link>
  );
}
