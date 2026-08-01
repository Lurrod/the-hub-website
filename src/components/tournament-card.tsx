import Link from "next/link";
import { TOURNAMENT_STATUS_LABELS, type TournamentStatus } from "@/lib/constants";
import StatusBadge from "@/components/status-badge";

type TournamentCardData = {
  id: string;
  name: string;
  region: string;
  status: string;
  logo: string | null;
  startDate: Date | null;
  endDate: Date | null;
  prizePool: string | null;
  _count?: { participants: number };
};

function formatDateRange(start: Date | null, end: Date | null): string {
  if (!start) return "Date à définir";
  const fmt = (d: Date) =>
    new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  if (!end) return fmt(start);
  return `${fmt(start)} - ${fmt(end)}`;
}

function StatItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{label}</div>
      <div className={`truncate text-sm font-medium text-white ${mono ? "stat" : ""}`}>{value}</div>
    </div>
  );
}

export default function TournamentCard({ tournament }: { tournament: TournamentCardData }) {
  const teamCount = tournament._count?.participants ?? 0;
  return (
    <Link
      href={`/tournois/${tournament.id}`}
      className="card card-interactive flex flex-col gap-4 p-5"
    >
      <div className="flex items-center gap-3">
        {tournament.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img loading="lazy" decoding="async" src={tournament.logo} alt="" className="h-12 w-12 rounded-lg object-cover" />
        ) : (
          <div className="monogram grid h-12 w-12 place-items-center rounded-lg text-sm">
            {tournament.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-semibold text-white">{tournament.name}</div>
          <div className="text-xs text-[var(--text-muted)]">{tournament.region}</div>
        </div>
        <StatusBadge
          label={TOURNAMENT_STATUS_LABELS[tournament.status as TournamentStatus] ?? tournament.status}
          status={tournament.status}
        />
      </div>

      <div className="flex flex-col gap-4 border-t border-[var(--border)] pt-4">
        <StatItem
          label="Dates"
          value={formatDateRange(tournament.startDate, tournament.endDate)}
          mono={!!tournament.startDate}
        />
        <div className="grid grid-cols-2 gap-4">
          <StatItem label="Équipes" value={teamCount > 0 ? `${teamCount}` : "-"} mono={teamCount > 0} />
          <StatItem label="Cashprize" value={tournament.prizePool ?? "-"} mono={tournament.prizePool != null} />
        </div>
      </div>
    </Link>
  );
}
