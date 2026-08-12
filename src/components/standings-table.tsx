import type { StandingDisplayRow } from "@/lib/standings";
import { EmptyLine } from "@/components/empty-state";

export type { StandingDisplayRow };

export default function StandingsTable({ rows }: { rows: StandingDisplayRow[] }) {
  if (rows.length === 0) {
    return <EmptyLine>Aucune équipe dans cette poule.</EmptyLine>;
  }
  // La colonne des nuls n'apparaît que s'il y en a : en élimination directe et
  // dans la plupart des poules, elle ne serait qu'une colonne de zéros.
  const showDraws = rows.some((r) => r.draws > 0);
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--text-subtle)]">
          <th scope="col" className="py-2 pl-3 pr-2 font-medium">
            #
          </th>
          <th scope="col" className="py-2 pr-2 font-medium">
            Équipe
          </th>
          <th scope="col" className="py-2 pr-3 text-center font-medium">
            J
          </th>
          <th scope="col" className="py-2 pr-3 text-center font-medium">
            V
          </th>
          {showDraws && (
            <th scope="col" className="py-2 pr-3 text-center font-medium" title="Matchs nuls">
              N
            </th>
          )}
          <th scope="col" className="py-2 pr-3 text-center font-medium">
            D
          </th>
          <th scope="col" className="py-2 pr-3 text-center font-medium">
            Diff
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr
            key={r.teamId}
            className="border-t border-[var(--border)] transition-colors hover:bg-[var(--table-row-hover)]"
          >
            <td className="stat py-2.5 pl-3 pr-2">
              <span className={i < 2 ? "text-[var(--accent)]" : "text-[var(--text-subtle)]"}>
                {i + 1}
              </span>
            </td>
            <td className="py-2.5 pr-2 font-medium text-white">{r.teamName}</td>
            <td className="stat py-2.5 pr-3 text-center text-[var(--text-muted)]">{r.played}</td>
            <td className="stat py-2.5 pr-3 text-center text-white">{r.wins}</td>
            {showDraws && (
              <td className="stat py-2.5 pr-3 text-center text-[var(--text-muted)]">{r.draws}</td>
            )}
            <td className="stat py-2.5 pr-3 text-center text-[var(--text-muted)]">{r.losses}</td>
            <td
              className={`stat py-2.5 pr-3 text-center ${
                r.mapDiff > 0
                  ? "text-[var(--success)]"
                  : r.mapDiff < 0
                    ? "text-[var(--text-muted)]"
                    : "text-white"
              }`}
            >
              {r.mapDiff > 0 ? `+${r.mapDiff}` : r.mapDiff}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
