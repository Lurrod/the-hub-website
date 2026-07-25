import Link from "next/link";
import { orderBracketSections, type BracketMatchData, type BracketSection } from "@/lib/bracket";

export type { BracketMatchData };

export default function Bracket({ matches }: { matches: BracketMatchData[] }) {
  if (matches.length === 0) {
    return <p className="text-[var(--text-muted)]">Aucun match de bracket saisi.</p>;
  }

  const sections = orderBracketSections(matches);
  const upper = sections.find((s) => s.key === "upper");
  const lower = sections.find((s) => s.key === "lower");
  const final = sections.find((s) => s.key === "final");

  // Double élimination : upper + lower à gauche, Grande Finale à droite, reliée
  // aux deux finales.
  if (upper && lower && final) {
    return (
      <div className="flex items-stretch gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-8">
          <SectionBlock section={upper} />
          <SectionBlock section={lower} />
        </div>

        {/* Connecteur : les deux finales convergent vers la grande finale. */}
        <div className="relative w-6 shrink-0 self-stretch">
          <span className="pointer-events-none absolute bottom-1/4 left-0 top-1/4 w-px bg-[var(--border-strong)]" />
          <span className="pointer-events-none absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-[var(--border-strong)]" />
        </div>

        <div className="flex shrink-0 flex-col justify-center">
          {final.title && <div className="eyebrow mb-3">{final.title}</div>}
          <div className="flex flex-col gap-3">
            {final.rounds
              .flatMap((r) => r.matches)
              .map((m) => (
                <BracketCell key={m.id} match={m} />
              ))}
          </div>
        </div>
      </div>
    );
  }

  // Autres formats : sections empilées.
  return (
    <div className="space-y-8">
      {sections.map((sec) => (
        <SectionBlock key={sec.key} section={sec} withTitle />
      ))}
    </div>
  );
}

function SectionBlock({
  section,
  withTitle = true,
}: {
  section: BracketSection;
  withTitle?: boolean;
}) {
  return (
    <div>
      {withTitle && section.title && <div className="eyebrow mb-3">{section.title}</div>}
      <div className="flex gap-6 overflow-x-auto pb-2">
        {section.rounds.map((round) => (
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
