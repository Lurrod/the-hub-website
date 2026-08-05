import Link from "next/link";
import Flag from "@/components/flag";
import { roleIconUrl, roleLabel } from "@/lib/roles";
import type { DirectoryRow } from "@/lib/data/players-directory";

/**
 * Classement des joueurs.
 *
 * Le rang affiché est celui de la page courante (offset + index) : recalculer
 * un rang global n'aurait de sens que sur le tri par défaut, et serait faux
 * dès qu'un filtre est posé.
 */
export default function PlayerDirectory({
  players,
  offset,
  ranked,
}: {
  players: DirectoryRow[];
  offset: number;
  /** Le tri courant produit-il un classement ? Faux pour le tri alphabétique. */
  ranked: boolean;
}) {
  if (players.length === 0) {
    return <p className="text-sm text-[var(--text-muted)]">Aucun joueur pour ces filtres.</p>;
  }

  const num = "stat py-2.5 pr-3 text-right";
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--text-subtle)]">
            <th className="w-10 py-2 pl-3 pr-2 font-medium">{ranked ? "#" : ""}</th>
            <th className="py-2 pr-2 font-medium">Joueur</th>
            <th className="hidden py-2 pr-3 font-medium sm:table-cell">Équipe</th>
            <th className="py-2 pr-3 text-right font-medium" title="Cartes jouées">
              Cartes
            </th>
            <th className="hidden py-2 pr-3 text-right font-medium sm:table-cell">K/D</th>
            <th className="hidden py-2 pr-3 text-right font-medium sm:table-cell">ACS</th>
            <th className="py-2 pr-3 text-right font-medium">Rating</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p, i) => {
            const role = roleLabel(p.valorantRole);
            const roleIcon = roleIconUrl(p.valorantRole);
            // Sans partie jouée, il n'y a pas de contre-performance : il n'y a
            // pas de donnée. Un tiret le dit, un zéro mentirait.
            const played = p.maps > 0;
            return (
              <tr
                key={p.id}
                className="border-t border-[var(--border)] transition-colors hover:bg-[var(--table-row-hover)]"
              >
                <td className="stat py-2.5 pl-3 pr-2 text-[var(--text-subtle)]">
                  {ranked ? (
                    <span className={offset + i < 3 ? "text-[var(--accent)]" : undefined}>
                      {offset + i + 1}
                    </span>
                  ) : null}
                </td>
                <td className="py-2.5 pr-2">
                  <Link href={`/joueurs/${p.id}`} className="group flex items-center gap-2.5">
                    {p.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        loading="lazy"
                        decoding="async"
                        src={p.photo}
                        alt=""
                        className="h-8 w-8 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="monogram grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px]">
                        {p.pseudo.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate font-medium text-white transition-colors group-hover:text-[var(--accent)]">
                          {p.pseudo}
                        </span>
                        <Flag country={p.nationality} />
                      </span>
                      {role && (
                        <span className="mt-0.5 flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                          {roleIcon && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              loading="lazy"
                              decoding="async"
                              src={roleIcon}
                              alt=""
                              className="h-3 w-3 shrink-0 opacity-70"
                            />
                          )}
                          {role}
                        </span>
                      )}
                    </span>
                  </Link>
                </td>
                <td className="hidden py-2.5 pr-3 sm:table-cell">
                  {p.teamId ? (
                    <Link
                      href={`/equipes/${p.teamId}`}
                      className="stat text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]"
                    >
                      {p.teamTag}
                    </Link>
                  ) : (
                    <span className="text-xs text-[var(--text-subtle)]">-</span>
                  )}
                </td>
                <td className={`${num} text-[var(--text-muted)]`}>{p.maps}</td>
                <td className={`${num} hidden text-[var(--text-muted)] sm:table-cell`}>
                  {played ? p.kd.toFixed(2) : "-"}
                </td>
                <td className={`${num} hidden text-[var(--text-muted)] sm:table-cell`}>
                  {played ? p.acs : "-"}
                </td>
                <td className={`${num} font-semibold text-white`}>
                  {played ? p.rating.toFixed(2) : "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
