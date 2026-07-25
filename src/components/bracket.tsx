import Link from "next/link";
import { orderBracketSections, type BracketMatchData } from "@/lib/bracket";

export type { BracketMatchData };

export default function Bracket({ matches }: { matches: BracketMatchData[] }) {
  if (matches.length === 0) {
    return <p className="text-[var(--text-muted)]">Aucun match de bracket saisi.</p>;
  }

  const sections = orderBracketSections(matches);

  return (
    <div className="space-y-8">
      {sections.map((sec) => (
        <div key={sec.key}>
          {sec.title && <div className="eyebrow mb-3">{sec.title}</div>}
          <div className="flex gap-6 overflow-x-auto pb-2">
            {sec.rounds.map((round) => (
              <div key={round.name} className="flex min-w-[160px] flex-col gap-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  {round.name}
                </div>
                <div className="flex flex-1 flex-col justify-center gap-3">
                  {round.matches.map((m) => (
                    <BracketCell key={m.id} match={m} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function BracketCell({ match }: { match: BracketMatchData }) {
  const aWin = match.winnerId != null && match.winnerId === match.teamAId;
  const bWin = match.winnerId != null && match.winnerId === match.teamBId;
  const row = "flex items-center justify-between px-2.5 py-1.5 text-sm";
  return (
    <Link
      href={`/matchs/${match.id}`}
      className="card block transition-colors hover:border-[var(--border-strong)]"
    >
      <div className={`${row} ${aWin ? "font-semibold text-[var(--accent)]" : "text-white"}`}>
        <span className="truncate">{match.teamA?.tag ?? "—"}</span>
        <span className="stat">{match.scoreA}</span>
      </div>
      <div className="border-t border-[var(--border)]" />
      <div className={`${row} ${bWin ? "font-semibold text-[var(--accent)]" : "text-white"}`}>
        <span className="truncate">{match.teamB?.tag ?? "—"}</span>
        <span className="stat">{match.scoreB}</span>
      </div>
    </Link>
  );
}
