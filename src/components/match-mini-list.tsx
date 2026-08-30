import Link from "next/link";
import { EmptyLine } from "@/components/empty-state";
import { shortDate, timeLabel } from "@/lib/dates";
import { displayScores } from "@/lib/forfeit";
import type { MatchForfeit } from "@/lib/constants";

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
  forfeit?: MatchForfeit | null;
  status?: string | null;
  /** Scores des maps : sur un BO1, la ligne affiche le score de la map. */
  bestOf?: number | null;
  maps?: { scoreA: number; scoreB: number }[] | null;
};

function TeamLine({
  team,
  score,
  defeated,
}: {
  team: Side;
  score?: string | null;
  defeated: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 ${defeated ? "opacity-60" : ""}`}>
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
    match est joué), sur une nappe orange qui monte du bas de la liste
    (`.match-bloom-box`, voir `src/styles/components.css`). */
export default function MatchMiniList({
  matches,
  empty = "Aucun match.",
}: {
  matches: MiniMatch[];
  empty?: string;
}) {
  if (matches.length === 0) {
    return <EmptyLine>{empty}</EmptyLine>;
  }
  return (
    <ul className="match-bloom-box divide-y divide-[var(--border)] overflow-hidden rounded-lg border border-[var(--border)]">
      {matches.map((m) => {
        const played = m.scoreA != null && m.scoreB != null;
        const score = played
          ? displayScores({
              scoreA: m.scoreA!,
              scoreB: m.scoreB!,
              forfeit: m.forfeit,
              status: m.status,
              bestOf: m.bestOf,
              maps: m.maps,
            })
          : null;
        // Sur un forfait les scores restent à 0-0 : la comparaison ne
        // griserait personne, c'est le « FF » qui désigne le battu.
        const hasFF = score != null && (score.a === "FF" || score.b === "FF");
        return (
          <li key={m.id}>
            <Link
              href={`/matchs/${m.id}`}
              className="match-bloom-row block px-3 py-2.5 transition-colors"
            >
              <div className="mb-1.5 flex items-center gap-2 text-[10px]">
                <span className="text-white">{timeLabel(m.date, m.hasTime ?? false)}</span>
                <span className="text-[var(--text-muted)]">{shortDate(m.date)}</span>
              </div>
              <div className="space-y-1">
                <TeamLine
                  team={m.teamA}
                  score={score?.a}
                  defeated={hasFF ? score?.a === "FF" : played && m.scoreA! < m.scoreB!}
                />
                <TeamLine
                  team={m.teamB}
                  score={score?.b}
                  defeated={hasFF ? score?.b === "FF" : played && m.scoreB! < m.scoreA!}
                />
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
