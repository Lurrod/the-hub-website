import Link from "next/link";
import { agentIconUrl } from "@/lib/agents";
import type {
  StatEntry,
  StatRecord,
  StatLeaderboard,
  TournamentFact,
} from "@/lib/data/tournament-stats";

/** Vignette d'agent, taille contrôlable (repli initiales si inconnu). */
function AgentThumb({ agent, size = "h-8 w-8" }: { agent?: string | null; size?: string }) {
  const url = agentIconUrl(agent);
  if (!url) {
    return (
      <span
        className={`grid ${size} shrink-0 place-items-center rounded-lg bg-[var(--bg)] text-xs text-[var(--text-muted)]`}
        title={agent ?? ""}
      >
        {agent ? agent.slice(0, 2).toUpperCase() : "?"}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={agent ?? ""}
      title={agent ?? ""}
      className={`${size} shrink-0 rounded-lg object-cover`}
      loading="lazy"
    />
  );
}

/** Icône chronomètre (pour la partie la plus longue). */
function Stopwatch() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6 shrink-0 text-[var(--accent)]"
      aria-hidden="true"
    >
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2 2" />
      <path d="M9 2h6" />
      <path d="M12 4V2" />
    </svg>
  );
}

function PlayerName({ entry }: { entry: StatEntry }) {
  const inner = (
    <>
      {entry.name}
      {entry.teamTag && (
        <>
          <span className="dot-sep">·</span>
          <span className="text-[var(--text-muted)]">{entry.teamTag}</span>
        </>
      )}
    </>
  );
  return entry.playerId ? (
    <Link href={`/joueurs/${entry.playerId}`} className="truncate hover:text-[var(--accent)]">
      {inner}
    </Link>
  ) : (
    <span className="truncate">{inner}</span>
  );
}

/** Rend une chaîne « a · b » avec des séparateurs « · » espacés. */
function Detail({ text }: { text: string }) {
  const parts = text.split(" · ");
  return (
    <>
      {parts.map((p, i) => (
        <span key={i}>
          {i > 0 && <span className="dot-sep">·</span>}
          {p}
        </span>
      ))}
    </>
  );
}

/** Carte stat compacte : valeur mise en avant + (option) vignette d'agent. */
function BigStatCard({ record, showAgent }: { record: StatRecord; showAgent?: boolean }) {
  if (!record.entry) return null;
  const e = record.entry;
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
      <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{record.label}</div>
      <div className="mt-1.5 flex items-center gap-2">
        {showAgent && <AgentThumb agent={e.agent} size="h-8 w-8" />}
        <span className="stat text-2xl font-bold leading-none text-[var(--accent)]">{e.valueLabel}</span>
      </div>
      <div className="mt-2 truncate text-sm font-semibold text-white">
        <PlayerName entry={e} />
      </div>
      {e.detail && (
        <div className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">
          <Detail text={e.detail} />
        </div>
      )}
    </div>
  );
}

/** Carte fait du tournoi : perso (icône) / map (image de fond) / partie (chrono). */
function FactCard({ fact }: { fact: TournamentFact }) {
  const hasImg = !!fact.image;
  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-[var(--border)] p-3 ${
        hasImg ? "" : "bg-[var(--surface)]"
      }`}
    >
      {hasImg && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fact.image!} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface)] via-[var(--surface)]/70 to-transparent" />
        </>
      )}
      <div className="relative">
        <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{fact.label}</div>
        <div className="mt-1.5 flex items-center gap-2">
          {fact.agent && <AgentThumb agent={fact.agent} size="h-8 w-8" />}
          {fact.key === "longest-game" && <Stopwatch />}
          <span className="stat truncate text-xl font-bold text-white">{fact.value}</span>
        </div>
        {fact.detail && (
          <div className="mt-1.5 truncate text-[11px] text-[var(--accent)]">
            <Detail text={fact.detail} />
          </div>
        )}
      </div>
    </div>
  );
}

/** Carte classement cumulé : top 5. */
function LeaderboardCard({ board }: { board: StatLeaderboard }) {
  if (board.entries.length === 0) return null;
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
      <div className="mb-2 text-[10px] uppercase tracking-wide text-[var(--accent)]">{board.label}</div>
      <ol className="flex flex-col gap-1">
        {board.entries.map((e, i) => (
          <li key={`${e.playerId ?? e.name}-${i}`} className="flex items-center gap-2 text-sm">
            <span className="stat w-4 shrink-0 text-right text-xs text-[var(--text-subtle)]">{i + 1}</span>
            <div className="min-w-0 flex-1 text-white">
              <PlayerName entry={e} />
            </div>
            <span className="stat shrink-0 font-semibold text-white">{e.valueLabel}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

const SECTION = "mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--accent)]";
const GRID = "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4";

export default function TournamentStats({
  tournamentRecords,
  records,
  averages,
  totals,
}: {
  tournamentRecords: TournamentFact[];
  records: StatRecord[];
  averages: StatRecord[];
  totals: StatLeaderboard[];
}) {
  return (
    <div className="space-y-8">
      {tournamentRecords.length > 0 && (
        <section>
          <h2 className={SECTION}>Records du tournoi</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {tournamentRecords.map((f) => (
              <FactCard key={f.key} fact={f} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className={SECTION}>Records d&apos;une game</h2>
        <div className={GRID}>
          {records.map((r) => (
            <BigStatCard key={r.key} record={r} showAgent />
          ))}
        </div>
      </section>

      <section>
        <h2 className={SECTION}>Meilleures moyennes</h2>
        <div className={GRID}>
          {averages.map((r) => (
            <BigStatCard key={r.key} record={r} />
          ))}
        </div>
      </section>

      <section>
        <h2 className={SECTION}>Cumuls du tournoi</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {totals.map((b) => (
            <LeaderboardCard key={b.key} board={b} />
          ))}
        </div>
      </section>
    </div>
  );
}
