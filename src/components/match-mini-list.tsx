import Link from "next/link";
import { shortDate, timeLabel } from "@/lib/dates";

type Side = { tag: string; logo: string | null } | null;

export type MiniMatch = {
  id: string;
  date: Date | null;
  hasTime?: boolean;
  teamA: Side;
  teamB: Side;
  /** Scores : présents pour un match terminé, absents pour un match à venir. */
  scoreA?: number | null;
  scoreB?: number | null;
};

function TeamLine({
  team,
  score,
  defeated,
}: {
  team: Side;
  score?: number | null;
  defeated: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 ${defeated ? "opacity-60" : ""}`}>
      {team?.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img loading="lazy" decoding="async" src={team.logo} alt="" className="h-6 w-6 shrink-0 rounded object-cover" />
      ) : (
        <div className="grid h-6 w-6 shrink-0 place-items-center rounded bg-[var(--surface)] text-[9px] text-[var(--text-muted)]">
          {team?.tag?.slice(0, 3).toUpperCase() ?? "?"}
        </div>
      )}
      <span className="truncate text-xs text-white">{team?.tag ?? "-"}</span>
      {score != null && <span className="stat ml-auto text-xs text-white">{score}</span>}
    </div>
  );
}

/** Colonne continue de matchs : date/heure au-dessus, logo + tag (+ score si le
    match est joué), avec une lueur orange en fond de chaque match. */
export default function MatchMiniList({
  matches,
  empty = "Aucun match.",
}: {
  matches: MiniMatch[];
  empty?: string;
}) {
  if (matches.length === 0) {
    return <p className="text-sm text-[var(--text-muted)]">{empty}</p>;
  }
  return (
    <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-lg border border-[var(--border)]">
      {matches.map((m) => {
        const played = m.scoreA != null && m.scoreB != null;
        return (
          <li key={m.id}>
            <Link
              href={`/matchs/${m.id}`}
              className="relative isolate block px-3 py-2.5 transition-colors hover:bg-[var(--card-hover)]"
            >
              <div
                aria-hidden
                className="absolute inset-0 -z-10 bg-[radial-gradient(55%_75%_at_100%_100%,var(--accent-glow),transparent_60%)]"
              />
              <div className="mb-1.5 flex items-center gap-2 text-[10px]">
                <span className="text-white">{timeLabel(m.date, m.hasTime ?? false)}</span>
                <span className="text-[var(--text-muted)]">{shortDate(m.date)}</span>
              </div>
              <div className="space-y-1">
                <TeamLine
                  team={m.teamA}
                  score={m.scoreA}
                  defeated={played && m.scoreA! < m.scoreB!}
                />
                <TeamLine
                  team={m.teamB}
                  score={m.scoreB}
                  defeated={played && m.scoreB! < m.scoreA!}
                />
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
