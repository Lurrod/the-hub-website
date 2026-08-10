import Link from "next/link";
import { formatSite } from "@/lib/timezone";

export type MatchRowData = {
  id: string;
  teamAId: string;
  teamBId: string;
  scoreA: number;
  scoreB: number;
  winnerId: string | null;
  status: string;
  date?: Date | string | null;
  hasTime?: boolean;
  bestOf?: number;
  vodUrl?: string | null;
  teamA: { name: string; tag: string; logo: string | null } | null;
  teamB: { name: string; tag: string; logo: string | null } | null;
  contextLabel?: string;
};

/**
 * Jour et heure du coup d'envoi, en heure de Paris. `time` est vide quand
 * seule la date est connue : mieux vaut n'afficher aucune heure qu'un minuit
 * qui n'a jamais été saisi.
 */
function formatSchedule(
  date: Date | string | null | undefined,
  hasTime: boolean
): { day: string; time: string } | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return null;
  return {
    day: formatSite(d, { day: "2-digit", month: "short" }),
    time: hasTime ? formatSite(d, { hour: "2-digit", minute: "2-digit" }) : "",
  };
}

function Side({
  team,
  isWinner,
  align,
}: {
  team: { name: string; tag: string; logo: string | null } | null;
  isWinner: boolean;
  align: "left" | "right";
}) {
  return (
    <div
      className={`flex w-32 items-center justify-end gap-2 ${align === "right" ? "flex-row-reverse" : ""}`}
    >
      {team?.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          loading="lazy"
          decoding="async"
          src={team.logo}
          alt=""
          className="h-6 w-6 shrink-0 rounded object-cover"
        />
      ) : (
        <div className="monogram grid h-6 w-6 shrink-0 place-items-center rounded text-[10px]">
          {(team?.tag ?? "?").slice(0, 3).toUpperCase()}
        </div>
      )}
      <span
        className={`truncate text-sm ${isWinner ? "font-semibold text-white" : "text-[var(--text-muted)]"}`}
      >
        {team?.name ?? "-"}
      </span>
    </div>
  );
}

export default function MatchRow({
  match,
  bare = false,
}: {
  match: MatchRowData;
  /** Sans contour ni fond : pour les listes déjà encadrées par leur conteneur. */
  bare?: boolean;
}) {
  const aWin = match.winnerId != null && match.winnerId === match.teamAId;
  const bWin = match.winnerId != null && match.winnerId === match.teamBId;
  const schedule = formatSchedule(match.date, match.hasTime ?? false);
  return (
    <Link
      href={`/matchs/${match.id}`}
      className={`${
        bare
          ? "cursor-pointer rounded-lg transition-colors hover:bg-[var(--card-hover)]"
          : "card card-interactive"
      } grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-3 py-1.5`}
    >
      {/* Horaires (gauche) */}
      <div className="w-14 shrink-0 text-xs leading-tight">
        {schedule ? (
          <>
            <div className="text-[var(--text-muted)]">{schedule.day}</div>
            <div className="stat text-white">{schedule.time}</div>
          </>
        ) : (
          <span className="text-[var(--text-muted)]">-</span>
        )}
      </div>

      {/* Équipes + score (centrés dans la ligne) */}
      <div className="flex shrink-0 items-center gap-3 justify-self-center">
        <Side team={match.teamA} isWinner={aWin} align="left" />
        <div className="stat flex items-center gap-1.5 text-sm">
          <span
            className={aWin ? "font-semibold text-[var(--accent)]" : "text-[var(--text-muted)]"}
          >
            {match.scoreA}
          </span>
          <span className="text-[var(--text-subtle)]">-</span>
          <span
            className={bWin ? "font-semibold text-[var(--accent)]" : "text-[var(--text-muted)]"}
          >
            {match.scoreB}
          </span>
        </div>
        <Side team={match.teamB} isWinner={bWin} align="right" />
      </div>

      {/* Zone droite libre : format + contexte (extensible plus tard) */}
      <div className="flex shrink-0 items-center gap-2 justify-self-end">
        {match.status === "LIVE" ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase text-[var(--accent)]">
            <span className="live-dot" aria-hidden="true" /> Live
          </span>
        ) : null}
        {match.vodUrl ? (
          <span className="rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--accent)]">
            VOD
          </span>
        ) : null}
        {match.bestOf ? (
          <span className="stat rounded bg-[var(--surface)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
            BO{match.bestOf}
          </span>
        ) : null}
        {match.contextLabel && (
          <span className="hidden text-xs text-[var(--text-muted)] sm:block">
            {match.contextLabel}
          </span>
        )}
      </div>
    </Link>
  );
}
