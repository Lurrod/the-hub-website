import type { TeamStats } from "@/lib/tournament-teams-core";

/**
 * Grille équipes × maps, couleur selon le winrate.
 *
 * Rampe séquentielle à teinte unique, du sombre au vif : la magnitude est le
 * sujet, pas l'identité, donc surtout pas une couleur par équipe. Une case sans
 * match reste neutre plutôt que d'afficher un 0 % qui se lirait comme un échec.
 *
 * Le chiffre est écrit dans chaque case : la couleur seule ne peut pas porter
 * une valeur précise, et un daltonien lit la même chose que tout le monde.
 */
export default function MapHeatmap({ teams }: { teams: TeamStats[] }) {
  const mapNames = [...new Set(teams.flatMap((t) => t.maps.map((m) => m.mapName)))].sort();
  if (mapNames.length === 0 || teams.length === 0) {
    return <p className="text-sm text-[var(--text-muted)]">Aucune carte jouée.</p>;
  }

  const cellOf = (t: TeamStats, mapName: string) => t.maps.find((m) => m.mapName === mapName);

  /**
   * Part d'accent dans le fond de la case.
   *
   * Plafonnée à 0,75 et non 0,90 : au-delà, le fond devient assez clair pour
   * que le texte blanc tombe à 3,98:1, sous le seuil AA. À 0,75 il tient
   * 5,15:1 sur toute l'échelle, et l'écart visuel entre une case à 0 % et une
   * case à 100 % reste parfaitement lisible.
   */
  const fill = (winrate: number) => 0.15 + (winrate / 100) * 0.6;

  return (
    <div className="scroll-x">
      <table className="w-full min-w-[560px] border-separate border-spacing-0.5 text-xs">
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky left-0 z-10 bg-[var(--surface)] px-2 py-1 text-left font-medium text-[var(--text-muted)]"
            >
              Équipe
            </th>
            {mapNames.map((m) => (
              <th
                scope="col"
                key={m}
                className="px-1 py-1 text-center font-medium text-[var(--text-muted)]"
              >
                {m}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {teams.map((t) => (
            <tr key={t.team.id}>
              <th
                scope="row"
                className="sticky left-0 z-10 bg-[var(--surface)] px-2 py-1 text-left font-medium text-white"
              >
                <span className="flex items-center gap-1.5">
                  {t.team.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={t.team.logo}
                      alt=""
                      loading="lazy"
                      className="h-4 w-4 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <span className="monogram grid h-4 w-4 shrink-0 place-items-center rounded text-[8px]">
                      {t.team.tag.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <span className="truncate">{t.team.tag}</span>
                </span>
              </th>
              {mapNames.map((m) => {
                const c = cellOf(t, m);
                if (!c) {
                  return (
                    <td
                      key={m}
                      className="rounded bg-[var(--bg)] px-1 py-1.5 text-center text-[var(--text-subtle)]"
                      title={`${t.team.name} n'a pas joué ${m}`}
                    >
                      –
                    </td>
                  );
                }
                return (
                  <td
                    key={m}
                    className="rounded px-1 py-1.5 text-center font-semibold text-white"
                    style={{
                      backgroundColor: `color-mix(in srgb, var(--accent) ${fill(c.winratePct) * 100}%, var(--bg))`,
                    }}
                    title={`${t.team.name} sur ${m} — ${c.won} victoire(s) sur ${c.played} carte(s)`}
                  >
                    {c.winratePct}%
                    {/* Pas d'`opacity` ici : elle s'applique au contraste
                        autant qu'à la couleur, et ramenait ce sous-compte à
                        3,33:1 sur les cases à fort taux de victoire. La
                        hiérarchie se joue à la taille et à la graisse. */}
                    <span className="ml-1 text-[10px] font-normal">
                      {c.won}/{c.played}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
