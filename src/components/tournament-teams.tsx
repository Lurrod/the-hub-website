import Link from "next/link";
import EmptyState, { ListDecor } from "@/components/empty-state";
import Flag from "@/components/flag";
import AgentDonut from "@/components/charts/agent-donut";
import MapHeatmap from "@/components/charts/map-heatmap";
import FormStreak from "@/components/form-streak";
import type { TeamStats } from "@/lib/tournament-teams-core";

const SECTION = "mb-1 text-sm font-semibold uppercase tracking-wide text-[var(--accent)]";
const NOTE = "mb-4 text-xs text-[var(--text-muted)]";
const CARD = "rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4";
/** Ligne d'en-tête des listes chiffrées, calée sur les largeurs des colonnes. */
const COLS_HEAD =
  "mb-1.5 flex items-center gap-2 text-[9px] uppercase tracking-wide text-[var(--text-subtle)]";

/**
 * Une teinte par issue de round. Les issues sont des catégories nominales, pas
 * une échelle : une rampe monochrome rendait les parts indiscernables.
 *
 * Palette validée dans cet ordre — c'est l'ordre d'empilement, donc celui qui
 * décide des voisinages : pire paire adjacente à ΔE 10.5 en deutéranopie et
 * 19.6 en vision normale, toutes dans la bande de clarté du mode sombre et
 * au-dessus de 3:1 sur la surface.
 */
const OUTCOME_COLORS: Record<string, string> = {
  elim: "var(--accent)",
  detonate: "var(--viz-blue)",
  defuse: "var(--viz-amber)",
  time: "var(--viz-green)",
};
const OUTCOME_LABEL: Record<string, string> = {
  elim: "Élimination",
  detonate: "Spike explosé",
  defuse: "Désamorçage",
  time: "Temps écoulé",
};
const OUTCOME_ORDER = ["elim", "detonate", "defuse", "time"];

function Crest({ team }: { team: TeamStats["team"] }) {
  return team.logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={team.logo} alt="" className="h-6 w-6 shrink-0 rounded object-cover" />
  ) : (
    <span className="monogram grid h-6 w-6 shrink-0 place-items-center rounded text-[9px]">
      {team.tag.slice(0, 2).toUpperCase()}
    </span>
  );
}

/**
 * Chiffre d'en-tête avec son intitulé au-dessus : sans lui, « 6–0 », « +36 » et
 * « 1.26 » s'alignaient sans que rien ne dise ce qu'ils comptent.
 */
function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="flex shrink-0 flex-col gap-1">
      <span className="text-[9px] uppercase tracking-wide text-[var(--text-subtle)]">{label}</span>
      <span className="text-xs font-semibold leading-none">{children}</span>
    </span>
  );
}

/** « 1 rounds » se lisait sur toutes les séries d'un seul round. */
const rounds = (n: number) => `${n} round${n > 1 ? "s" : ""}`;

/** Intitulé et valeur séparés du même écart que deux mesures voisines. */
function Measure({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-center gap-4 text-[var(--text-muted)]">
      {label}
      <span className="stat font-semibold text-white">{value}</span>
    </span>
  );
}

/** Barre simple, teinte unique — les catégories comparées sont nominales. */
function Bar({ pct, title }: { pct: number; title?: string }) {
  return (
    <div className="h-2 min-w-16 flex-1 rounded bg-[var(--bg)]" title={title}>
      <div
        className="h-full rounded bg-[var(--accent)]"
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  );
}

/** Bilan d'un camp : part gagnée, avec le détail chiffré. */
function SideBar({
  label,
  won,
  played,
  pct,
}: {
  label: string;
  won: number;
  played: number;
  pct: number;
}) {
  if (played === 0) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="w-20 shrink-0 text-[var(--text-muted)]">{label}</span>
        <span className="text-[var(--text-subtle)]">donnée absente</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 shrink-0 text-[var(--text-muted)]">{label}</span>
      <Bar pct={pct} title={`${won} rounds gagnés sur ${played}`} />
      <span className="stat w-14 shrink-0 text-right font-semibold text-white">{pct}%</span>
      <span className="w-12 shrink-0 text-right text-[10px] text-[var(--text-muted)]">
        {won}/{played}
      </span>
    </div>
  );
}

export default function TournamentTeams({ teams }: { teams: TeamStats[] }) {
  if (teams.length === 0) {
    return (
      <EmptyState
        title="Aucun match terminé"
        description="Le classement des équipes se construit à partir des rencontres jouées : victoires, différentiel de cartes et de rounds."
        decor={<ListDecor />}
      />
    );
  }

  const hasSideData = teams.some((t) => t.attack.played + t.defense.played > 0);
  const hasEcoData = teams.some((t) => t.ecoPlayed > 0);
  const maxKills = Math.max(...teams.flatMap((t) => t.players.map((p) => p.kills)), 1);

  const nationalities = new Map<string, number>();
  for (const t of teams) {
    for (const p of t.players) {
      if (p.nationality)
        nationalities.set(p.nationality, (nationalities.get(p.nationality) ?? 0) + 1);
    }
  }
  const flags = [...nationalities.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="flex flex-col gap-10">
      {/* 1. Classement enrichi, dépliable équipe par équipe. */}
      <section>
        <h2 className={SECTION}>Les équipes</h2>
        <p className={NOTE}>
          Déplie une équipe pour voir son effectif, ses agents et son détail par carte.
        </p>
        <div className="flex flex-col gap-2">
          {teams.map((t) => (
            <details key={t.team.id} className={`${CARD} t-resize-details group/team`}>
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-5 gap-y-3">
                {/* Seul le bloc logo + nom mène à la fiche de l'équipe. Tout le
                    reste de la ligne déplie le détail. */}
                {/* Le conteneur prend la place (pleine largeur en mobile, pousse
                    les chiffres à droite ensuite) mais n'est pas cliquable : seul
                    le lien qu'il contient l'est, et il s'arrête au nom. */}
                <span className="w-full min-w-0 sm:mr-auto sm:w-auto">
                  <Link
                    href={`/equipes/${t.team.id}`}
                    className="inline-flex max-w-full min-w-0 items-center gap-2 align-middle hover:text-[var(--accent)]"
                  >
                    <Crest team={t.team} />
                    <span className="truncate text-sm font-semibold text-white">{t.team.name}</span>
                  </Link>
                </span>

                <Cell label="Forme">
                  <FormStreak results={t.form} teamName={t.team.name} size="sm" />
                </Cell>
                <Cell label="Bilan">
                  {/* `matchesLost` est compté, pas déduit de la différence : une
                      série à égalité passerait sinon pour une défaite. */}
                  <span className="stat text-white">
                    {t.matchesWon}–{t.matchesLost}
                  </span>
                </Cell>
                <Cell label="Cartes">
                  <span className="stat text-white">
                    {t.mapsWon}/{t.mapsPlayed}
                  </span>
                </Cell>
                <Cell label="Diff. rounds">
                  <span
                    className={`stat ${t.roundDiff > 0 ? "text-white" : "text-[var(--text-muted)]"}`}
                  >
                    {t.roundDiff > 0 ? `+${t.roundDiff}` : t.roundDiff}
                  </span>
                </Cell>
                <Cell label="Rating">
                  <span className="stat text-[var(--accent)]">{t.avgRating.toFixed(2)}</span>
                </Cell>
              </summary>

              <div className="mt-4 grid gap-6 border-t border-[var(--border)] pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)]">
                <div>
                  <div className="mb-2 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                    Effectif
                  </div>
                  {/* Les colonnes de droite sont à largeur fixe : un en-tête
                      calé sur les mêmes largeurs reste aligné quelle que soit la
                      longueur des pseudos. */}
                  <div className={COLS_HEAD}>
                    <span className="min-w-0 flex-1">Joueur</span>
                    <span className="w-8 shrink-0 text-right">Kills</span>
                    <span className="w-10 shrink-0 text-right">Part</span>
                    <span className="w-10 shrink-0 text-right">Rating</span>
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {t.players.map((p) => (
                      <li
                        key={`${p.playerId ?? p.name}`}
                        className="flex items-center gap-2 text-xs"
                      >
                        {/* Emplacement réservé même sans drapeau, sinon les
                            pseudos se décalent d'une ligne à l'autre. */}
                        <span className="w-3.5 shrink-0">
                          {p.nationality && (
                            <Flag country={p.nationality} className="h-2.5 w-3.5" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-white">
                          {p.playerId ? (
                            <Link
                              href={`/joueurs/${p.playerId}`}
                              className="hover:text-[var(--accent)]"
                            >
                              {p.name}
                            </Link>
                          ) : (
                            p.name
                          )}
                        </span>
                        <Bar
                          pct={(p.kills / maxKills) * 100}
                          title={`${p.kills} kills — ${p.killShare} % des kills de l'équipe`}
                        />
                        <span className="stat w-8 shrink-0 text-right text-white">{p.kills}</span>
                        <span className="w-10 shrink-0 text-right text-[10px] text-[var(--text-muted)]">
                          {p.killShare}%
                        </span>
                        <span className="stat w-10 shrink-0 text-right text-[var(--accent)]">
                          {p.rating.toFixed(2)}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mb-2 mt-5 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                    Bilan par carte
                  </div>
                  <div className={COLS_HEAD}>
                    <span className="min-w-0 flex-1">Carte</span>
                    <span className="w-10 shrink-0 text-right">Winrate</span>
                    <span className="w-8 shrink-0 text-right">V/J</span>
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {t.maps.map((m) => (
                      <li key={m.mapName} className="flex items-center gap-2 text-xs">
                        <span className="w-20 shrink-0 truncate text-white">{m.mapName}</span>
                        <Bar pct={m.winratePct} title={`${m.won} victoire(s) sur ${m.played}`} />
                        <span className="stat w-10 shrink-0 text-right font-semibold text-white">
                          {m.winratePct}%
                        </span>
                        <span className="w-8 shrink-0 text-right text-[10px] text-[var(--text-muted)]">
                          {m.won}/{m.played}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="mb-2 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                    Agents joués
                  </div>
                  <AgentDonut
                    agents={t.agents.slice(0, 6).map((a) => ({
                      agent: a.agent,
                      maps: a.maps,
                      pct: Math.round(
                        (a.maps /
                          Math.max(
                            1,
                            t.agents.reduce((n, x) => n + x.maps, 0)
                          )) *
                          100
                      ),
                    }))}
                    totalMaps={t.mapsPlayed}
                    stacked
                  />
                </div>
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* 2. Heatmap équipes × maps. */}
      <section>
        <h2 className={SECTION}>Winrate par carte</h2>
        <p className={NOTE}>
          Plus la case est vive, plus l&apos;équipe gagne sur cette carte. Un tiret signale une
          carte jamais jouée — pas une défaite.
        </p>
        <div className={CARD}>
          <MapHeatmap teams={teams} />
        </div>
      </section>

      {/* 3. Comment chaque équipe gagne ses rounds. */}
      <section>
        <h2 className={SECTION}>Manière de gagner les rounds</h2>
        <p className={NOTE}>Répartition des rounds gagnés selon leur issue.</p>
        <div className={CARD}>
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[var(--text-muted)]">
            {OUTCOME_ORDER.map((o) => (
              <span key={o} className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: OUTCOME_COLORS[o] }}
                  aria-hidden
                />
                {OUTCOME_LABEL[o]}
              </span>
            ))}
          </div>
          <ul className="flex flex-col gap-2.5">
            {teams.map((t) => {
              const total = OUTCOME_ORDER.reduce((n, o) => n + (t.outcomes[o] ?? 0), 0);
              return (
                <li key={t.team.id} className="flex items-center gap-2 text-xs">
                  <span className="w-16 shrink-0 truncate text-white sm:w-24">{t.team.tag}</span>
                  <div className="flex h-3 min-w-0 flex-1 gap-0.5 overflow-hidden rounded">
                    {total === 0 ? (
                      <div className="h-full flex-1 bg-[var(--bg)]" />
                    ) : (
                      OUTCOME_ORDER.filter((o) => (t.outcomes[o] ?? 0) > 0).map((o) => (
                        <div
                          key={o}
                          className="h-full"
                          style={{
                            width: `${((t.outcomes[o] ?? 0) / total) * 100}%`,
                            backgroundColor: OUTCOME_COLORS[o],
                          }}
                          title={`${OUTCOME_LABEL[o]} — ${t.outcomes[o]} round(s) sur ${total}`}
                        />
                      ))
                    )}
                  </div>
                  <span className="stat w-10 shrink-0 text-right text-[var(--text-muted)]">
                    {total}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* 4. Attaque / défense — dépend de la donnée de camp. */}
      <section>
        <h2 className={SECTION}>Attaque et défense</h2>
        <p className={NOTE}>
          Round gagné en attaque ou défense.
          {!hasSideData &&
            " Aucune carte importée ne porte encore le camp — ré-importe une map pour l'alimenter."}
        </p>
        <div className={CARD}>
          <ul className="flex flex-col gap-4">
            {teams.map((t) => (
              <li key={t.team.id}>
                <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-white">
                  <Crest team={t.team} />
                  {t.team.tag}
                </div>
                <div className="flex flex-col gap-1.5">
                  <SideBar
                    label="Attaque"
                    won={t.attack.won}
                    played={t.attack.played}
                    pct={t.attack.winratePct}
                  />
                  <SideBar
                    label="Défense"
                    won={t.defense.won}
                    played={t.defense.played}
                    pct={t.defense.winratePct}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 5. Gun rounds et rounds à l'économie. */}
      <section>
        <h2 className={SECTION}>Gun rounds et économie</h2>
        <p className={NOTE}>
          Le gun round est le premier round de chaque mi-temps. Un round « eco » est un round joué
          avec au moins 4 000 d&apos;équipement de moins que l&apos;adversaire.
          {!hasEcoData && " L'économie n'est portée que par les cartes ré-importées."}
        </p>
        <div className={CARD}>
          <ul className="flex flex-col gap-2">
            {teams.map((t) => (
              <li key={t.team.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                <span className="flex w-24 shrink-0 items-center gap-1.5 font-semibold text-white">
                  <Crest team={t.team} />
                  {t.team.tag}
                </span>
                {/* Même écart entre un intitulé et sa valeur qu'entre deux
                    mesures : les valeurs collées à leur libellé se lisaient comme
                    un seul bloc de texte. */}
                <Measure label="Gun rounds" value={`${t.pistols.won}/${t.pistols.played}`} />
                <Measure
                  label="Eco gagnés"
                  value={t.ecoPlayed > 0 ? `${t.ecoWins}/${t.ecoPlayed}` : "–"}
                />
                <Measure label="Meilleure série" value={rounds(t.longestStreak)} />
                <Measure
                  label="Retard comblé"
                  value={t.biggestComeback > 0 ? rounds(t.biggestComeback) : "–"}
                />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 6. Duels d'entry collectifs. */}
      <section>
        <h2 className={SECTION}>Duels d&apos;entry collectifs</h2>
        <p className={NOTE}>Premiers kills et premières morts cumulés par l&apos;équipe.</p>
        <div className={CARD}>
          <ul className="flex flex-col gap-2">
            {teams.map((t) => {
              const total = t.firstKills + t.firstDeaths;
              const share = total > 0 ? (t.firstKills / total) * 100 : 0;
              const diff = t.firstKills - t.firstDeaths;
              return (
                <li key={t.team.id} className="flex items-center gap-2 text-xs">
                  <span className="flex w-20 shrink-0 items-center gap-1.5 truncate text-white sm:w-28">
                    <Crest team={t.team} />
                    {t.team.tag}
                  </span>
                  <Bar
                    pct={share}
                    title={`${t.firstKills} premiers kills, ${t.firstDeaths} premières morts`}
                  />
                  <span className="stat w-10 shrink-0 text-right font-semibold text-white">
                    {Math.round(share)}%
                  </span>
                  <span
                    className={`stat w-10 shrink-0 text-right ${
                      diff > 0 ? "text-white" : "text-[var(--text-muted)]"
                    }`}
                  >
                    {diff > 0 ? `+${diff}` : diff}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* 7. Provenance des joueurs. */}
      {flags.length > 0 && (
        <section>
          <h2 className={SECTION}>Nationalités</h2>
          <p className={NOTE}>Provenance des joueurs ayant disputé au moins une carte.</p>
          <div className={CARD}>
            <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
              {flags.map(([country, n]) => (
                <li key={country} className="flex items-center gap-1.5">
                  <Flag country={country} className="h-3 w-4" />
                  <span className="stat font-semibold text-white">{n}</span>
                  <span className="text-[var(--text-muted)]">{country}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
