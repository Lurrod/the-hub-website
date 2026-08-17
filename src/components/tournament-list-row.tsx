import Link from "next/link";
import { tournamentCountdownLabel } from "@/lib/dates";
import type { TournamentStatus } from "@/lib/constants";

type Row = {
  id: string;
  name: string;
  logo: string | null;
  startDate: Date | null;
  prizePool: string | null;
  teamCount: number;
  days: number | null;
  status: TournamentStatus;
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
      className="flex items-center gap-3 rounded px-3 py-2.5 transition-colors hover:bg-[var(--card-hover)] sm:gap-4"
    >
      <div className="w-14 shrink-0 sm:w-24">
        <span className="stat block text-center text-sm font-semibold text-[var(--accent)]">
          {tournamentCountdownLabel(t.status, t.days)}
        </span>
      </div>

      {t.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          loading="lazy"
          decoding="async"
          src={t.logo}
          alt={`Logo ${t.name}`}
          className="h-12 w-12 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-[var(--surface)] text-xs text-[var(--text-muted)]">
          {t.name.slice(0, 2).toUpperCase()}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold text-white">{t.name}</div>
        <div className="truncate text-xs text-[var(--text-muted)]">{fullDate(t.startDate)}</div>
      </div>

      {/* Équipes et cash prize masqués sous 640px : ils ne laissaient plus de
          place au nom du tournoi, qui est l'information principale. Les deux
          restent visibles sur la fiche du tournoi. */}
      <div className="ml-auto hidden shrink-0 items-center gap-5 sm:flex sm:gap-8">
        <div className="text-left">
          <div className="text-xs font-semibold text-white">{t.teamCount}</div>
          <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
            équipes
          </div>
        </div>
        <div className="text-left">
          <div className="text-xs font-semibold text-white">{t.prizePool ?? "-"}</div>
          <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
            cash prize
          </div>
        </div>
      </div>
    </Link>
  );
}
