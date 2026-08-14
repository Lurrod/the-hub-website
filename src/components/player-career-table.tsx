import Link from "next/link";
import AgentIcon from "@/components/agent-icon";
import EmptyState, { ListDecor } from "@/components/empty-state";
import LiveDuration from "@/components/live-duration";
import { lengthLabel } from "@/lib/duration";
import type { CareerStint } from "@/lib/data/player-career";

function monthYear(d: Date | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
}

const TH = "px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]";
const TD = "px-3 py-2.5 align-middle";

export default function PlayerCareerTable({ stints }: { stints: CareerStint[] }) {
  if (stints.length === 0) {
    return (
      <EmptyState
        title="Aucun passage en équipe"
        description="Le parcours se construit à mesure que le joueur rejoint des équipes : chaque passage y figure avec ses dates d'entrée et de sortie."
        action={{ label: "Voir les équipes", href: "/equipes" }}
        decor={<ListDecor rows={2} />}
      />
    );
  }
  return (
    <div
      className="scroll-x rounded-lg border border-[var(--border)]"
      style={{ backgroundColor: "var(--card)" }}
    >
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr
            className="border-b border-[var(--border)]"
            style={{ backgroundColor: "var(--card-hover)" }}
          >
            <th scope="col" className={`${TH} text-left`}>
              Équipe
            </th>
            <th scope="col" className={`${TH} text-center`}>
              Début
            </th>
            <th scope="col" className={`${TH} text-center`}>
              Fin
            </th>
            <th scope="col" className={`${TH} text-center`}>
              Durée
            </th>
            <th scope="col" className={`${TH} text-center`}>
              Parties
            </th>
            <th scope="col" className={`${TH} text-center`}>
              Win%
            </th>
            <th scope="col" className={`${TH} text-center`}>
              Top persos
            </th>
          </tr>
        </thead>
        <tbody>
          {stints.map((s) => {
            const current = s.leaveDate === null;
            return (
              <tr
                key={s.membershipId}
                className="border-b border-[var(--border)] last:border-0 transition-colors hover:bg-[var(--table-row-hover)]"
              >
                <td className={`${TD} text-left`}>
                  <Link
                    href={`/equipes/${s.teamId}`}
                    className="flex items-center gap-2 hover:text-[var(--accent)]"
                  >
                    {s.teamLogo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        loading="lazy"
                        decoding="async"
                        src={s.teamLogo}
                        alt=""
                        className="h-6 w-6 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <span className="monogram grid h-6 w-6 shrink-0 place-items-center rounded text-[9px]">
                        {s.teamTag.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <span className="truncate font-semibold text-white">{s.teamName}</span>
                  </Link>
                </td>
                <td className={`${TD} text-center font-semibold text-white`}>
                  {monthYear(s.joinDate)}
                </td>
                <td
                  className={`${TD} text-center ${current ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}`}
                >
                  {current ? "Actuel" : monthYear(s.leaveDate)}
                </td>
                <td
                  className={`${TD} stat text-center text-[var(--text-muted)]`}
                  style={{ wordSpacing: "0.2em" }}
                >
                  {current && s.joinDate ? (
                    <LiveDuration
                      startIso={new Date(s.joinDate).toISOString()}
                      initial={lengthLabel(s.joinDate, null)}
                    />
                  ) : (
                    lengthLabel(s.joinDate, s.leaveDate)
                  )}
                </td>
                <td className={`${TD} stat text-center text-white`}>{s.games}</td>
                <td className={`${TD} stat text-center`}>
                  {s.winRate != null ? (
                    <span className={s.winRate >= 50 ? "text-white" : "text-[var(--text-muted)]"}>
                      {s.winRate}%
                    </span>
                  ) : (
                    <span className="text-[var(--text-subtle)]">-</span>
                  )}
                </td>
                <td className={TD}>
                  {s.topAgents.length > 0 ? (
                    <div className="flex items-center justify-center gap-1">
                      {s.topAgents.map((a, i) => (
                        <AgentIcon key={i} agent={a} className="h-6 w-6" />
                      ))}
                      {s.extraAgents > 0 && (
                        <span className="stat ml-0.5 text-xs text-[var(--text-muted)]">
                          +{s.extraAgents}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="block text-center text-[var(--text-subtle)]">-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
