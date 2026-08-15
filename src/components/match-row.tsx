import Link from "next/link";
import { formatSite } from "@/lib/timezone";
import { fullDate } from "@/lib/dates";
import { displayScores } from "@/lib/forfeit";
import type { MatchForfeit } from "@/lib/constants";

export type MatchRowData = {
  id: string;
  teamAId: string;
  teamBId: string;
  scoreA: number;
  scoreB: number;
  winnerId: string | null;
  status: string;
  forfeit?: MatchForfeit | null;
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
  hasTime: boolean,
  withYear: boolean
): { day: string; time: string } | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return null;
  return {
    day: withYear ? fullDate(d) : formatSite(d, { day: "2-digit", month: "short" }),
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
    // Largeur réduite sous `sm` : à 128 px de chaque côté, la ligne réclamait
    // plus que la largeur d'un téléphone et débordait de la page.
    <div
      className={`flex w-16 items-center justify-end gap-2 sm:w-32 ${align === "right" ? "flex-row-reverse" : ""}`}
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
      {/* Le tag sur mobile, le nom complet à partir de `sm` : dans 80 px, un
          nom d'équipe tronqué à trois lettres en dit moins que son tag. */}
      <span
        className={`truncate text-sm ${isWinner ? "font-semibold text-white" : "text-[var(--text-muted)]"}`}
      >
        <span className="sm:hidden">{team?.tag ?? "-"}</span>
        <span className="hidden sm:inline">{team?.name ?? "-"}</span>
      </span>
    </div>
  );
}

export default function MatchRow({
  match,
  bare = false,
  withYear = false,
}: {
  match: MatchRowData;
  /** Sans contour ni fond : pour les listes déjà encadrées par leur conteneur. */
  bare?: boolean;
  /**
   * Date en JJ/MM/AAAA plutôt qu'en « 27 juil. ». Réservé aux listes qui
   * couvrent plusieurs saisons — les confrontations directes entre deux
   * équipes — où le mois seul ne dit pas de quelle année il s'agit. Les listes
   * de matchs à venir gardent le format court, plus lisible.
   */
  withYear?: boolean;
}) {
  const aWin = match.winnerId != null && match.winnerId === match.teamAId;
  const score = displayScores(match);
  const bWin = match.winnerId != null && match.winnerId === match.teamBId;
  const schedule = formatSchedule(match.date, match.hasTime ?? false, withYear);
  return (
    <Link
      href={`/matchs/${match.id}`}
      className={`${
        bare
          ? "cursor-pointer rounded-lg transition-colors hover:bg-[var(--card-hover)]"
          : "card card-interactive"
      } grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-2 py-1.5 sm:gap-3 sm:px-3`}
    >
      {/* Horaires (gauche) — plus large avec l'année, sinon « 27/07/2026 » se
          coupe en deux lignes. */}
      <div className={`${withYear ? "w-[4.6rem]" : "w-14"} shrink-0 text-xs leading-tight`}>
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
      <div className="flex shrink-0 items-center gap-2 justify-self-center sm:gap-3">
        <Side team={match.teamA} isWinner={aWin} align="left" />
        <div className="stat flex items-center gap-1.5 text-sm">
          <span
            className={aWin ? "font-semibold text-[var(--accent)]" : "text-[var(--text-muted)]"}
          >
            {score.a}
          </span>
          <span className="text-[var(--text-subtle)]">-</span>
          <span
            className={bWin ? "font-semibold text-[var(--accent)]" : "text-[var(--text-muted)]"}
          >
            {score.b}
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
