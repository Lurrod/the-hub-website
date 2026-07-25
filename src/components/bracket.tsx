import Link from "next/link";
import type { ReactNode } from "react";
import { orderBracketRounds, type BracketMatchData } from "@/lib/bracket";

export type { BracketMatchData };

function chunkPairs<T>(arr: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += 2) out.push(arr.slice(i, i + 2));
  return out;
}

export default function Bracket({ matches }: { matches: BracketMatchData[] }) {
  if (matches.length === 0) {
    return <p className="text-[var(--text-muted)]">Aucun match de bracket saisi.</p>;
  }

  const rounds = orderBracketRounds(matches);

  return (
    <div className="flex gap-6 overflow-x-auto pb-2">
      {rounds.map((round, i) => {
        const isLast = i === rounds.length - 1;
        return (
          <div key={round.name} className="flex min-w-[150px] flex-col">
            <div className="eyebrow mb-4">{round.name}</div>
            <div className="flex flex-1 flex-col gap-8">
              {isLast
                ? round.matches.map((m) => (
                    <div key={m.id} className="flex flex-1 flex-col justify-center">
                      <BracketCell match={m} />
                    </div>
                  ))
                : chunkPairs(round.matches).map((pair, pi) => (
                    <Connector key={pi} single={pair.length === 1}>
                      {pair.map((m) => (
                        <div key={m.id} className="relative flex min-h-[72px] flex-1 flex-col justify-center">
                          <BracketCell match={m} />
                          {/* stub horizontal depuis le centre du match vers la verticale */}
                          <span className="pointer-events-none absolute left-full top-1/2 h-px w-4 -translate-y-1/2 bg-[var(--border-strong)]" />
                        </div>
                      ))}
                    </Connector>
                  ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Connector({ single, children }: { single: boolean; children: ReactNode }) {
  return (
    <div className="relative flex flex-1 flex-col pr-4">
      {children}
      {/* verticale reliant les deux stubs horizontaux (centres à 25% et 75%) */}
      {!single && (
        <span className="pointer-events-none absolute right-0 top-1/4 h-1/2 w-px bg-[var(--border-strong)]" />
      )}
      {/* trait horizontal du milieu vers le round suivant */}
      <span className="pointer-events-none absolute left-full top-1/2 h-px w-6 -translate-y-1/2 bg-[var(--border-strong)]" />
    </div>
  );
}

function BracketCell({ match }: { match: BracketMatchData }) {
  const aWin = match.winnerId != null && match.winnerId === match.teamAId;
  const bWin = match.winnerId != null && match.winnerId === match.teamBId;
  const row = "flex items-center justify-between px-2.5 py-1.5 text-sm";
  return (
    <Link href={`/matchs/${match.id}`} className="card card-interactive relative block">
      <div className={`${row} ${aWin ? "font-semibold text-[var(--accent)]" : "text-white"}`}>
        <span className="truncate">{match.teamA?.tag ?? "—"}</span>
        <span className="font-mono">{match.scoreA}</span>
      </div>
      <div className="border-t border-[var(--border)]" />
      <div className={`${row} ${bWin ? "font-semibold text-[var(--accent)]" : "text-white"}`}>
        <span className="truncate">{match.teamB?.tag ?? "—"}</span>
        <span className="font-mono">{match.scoreB}</span>
      </div>
    </Link>
  );
}
