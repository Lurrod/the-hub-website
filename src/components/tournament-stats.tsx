import Link from "next/link";
import PlayerScatter from "@/components/charts/player-scatter";
import EntryDuels from "@/components/charts/entry-duels";
import BarList from "@/components/charts/bar-list";
import StatTile from "@/components/charts/stat-tile";
import WeaponDonut from "@/components/charts/weapon-donut";
import TournamentPlayerTable from "@/components/tournament-player-table";
import { agentIconUrl } from "@/lib/agents";
import { mapSplashUrl } from "@/lib/maps";
import { weaponIconUrl } from "@/lib/weapons";
import type {
  AgentPick,
  MapPoolEntry,
  MarginBucket,
  TournamentOverview,
} from "@/lib/tournament-stats-core";
import { fichePath } from "@/lib/slug";
import type {
  HighlightStats,
  PlayerPoint,
  StatRecord,
  StatLeaderboard,
  TournamentFact,
  WeaponStats,
} from "@/lib/data/tournament-stats";

/** Temps de jeu cumulé : les secondes n'apprennent rien à cette échelle. */
function fmtPlayTime(sec: number): string {
  if (sec < 3600) return `${Math.round(sec / 60)} min`;
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return `${h} h ${m.toString().padStart(2, "0")}`;
}

/** Silhouette d'arme, large et basse — les icônes Riot sont des profils. */
function WeaponThumb({ weapon }: { weapon: string }) {
  const url = weaponIconUrl(weapon);
  if (!url) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="h-4 w-10 shrink-0 object-contain" loading="lazy" />
  );
}

/**
 * Le duel des fusils : deux parts d'un même total, une teinte par arme.
 * Deux séries nominales côte à côte — c'est le cas où la deuxième teinte de la
 * palette de viz est légitime, contrairement aux barres à catégorie unique.
 */
function RifleDuel({ vandal, phantom }: { vandal: number; phantom: number }) {
  const total = vandal + phantom;
  if (total === 0) return null;
  const pct = Math.round((vandal / total) * 100);
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
      <div className="mb-2.5 text-[10px] uppercase tracking-wide text-[var(--accent)]">
        Vandal ou Phantom ?
      </div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="flex items-center gap-2 font-semibold text-white">
          <WeaponThumb weapon="Vandal" />
          <span className="stat">{vandal}</span>
        </span>
        <span className="flex items-center gap-2 font-semibold text-white">
          <span className="stat">{phantom}</span>
          <WeaponThumb weapon="Phantom" />
        </span>
      </div>
      <div
        className="mt-2 flex h-2.5 gap-0.5 overflow-hidden rounded"
        title={`Vandal ${vandal} kills (${pct} %) · Phantom ${phantom} kills (${100 - pct} %)`}
      >
        <div className="h-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
        <div className="h-full flex-1 bg-[var(--viz-blue)]" />
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-[var(--text-muted)]">
        <span>Vandal · {pct} %</span>
        <span>Phantom · {100 - pct} %</span>
      </div>
    </div>
  );
}

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

/**
 * Carte stat compacte : valeur mise en avant + (option) vignette d'agent.
 *
 * La carte entière mène à la fiche du joueur quand il en a une : viser le seul
 * pseudo était une cible minuscule, surtout au doigt.
 */
function BigStatCard({ record, showAgent }: { record: StatRecord; showAgent?: boolean }) {
  if (!record.entry) return null;
  const e = record.entry;
  const body = (
    <>
      <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
        {record.label}
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        {showAgent && <AgentThumb agent={e.agent} size="h-8 w-8" />}
        <span className="stat text-2xl font-bold leading-none text-[var(--accent)]">
          {e.valueLabel}
        </span>
      </div>
      <div className="mt-2 truncate text-sm font-semibold text-white">
        {e.name}
        {e.teamTag && (
          <>
            <span className="dot-sep">·</span>
            <span className="text-[var(--text-muted)]">{e.teamTag}</span>
          </>
        )}
      </div>
      {e.detail && (
        <div className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">
          <Detail text={e.detail} />
        </div>
      )}
    </>
  );

  const shell = "block rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3";
  return e.playerId ? (
    <Link
      href={fichePath("joueurs", e.playerId, e.name)}
      className={`${shell} transition-colors hover:border-[var(--accent)]`}
    >
      {body}
    </Link>
  ) : (
    <div className={shell}>{body}</div>
  );
}

/** Carte fait du tournoi : perso (icône) / map (image de fond) / partie (chrono). */
function FactCard({ fact }: { fact: TournamentFact }) {
  const hasImg = !!fact.image;
  return (
    <div
      className={`group/fact relative overflow-hidden rounded-lg border border-[var(--border)] p-3 transition-colors hover:border-[var(--border-strong)] ${
        hasImg ? "" : "bg-[var(--surface)]"
      }`}
    >
      {hasImg && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            loading="lazy"
            decoding="async"
            src={fact.image!}
            alt=""
            className="absolute inset-0 h-full w-full scale-100 object-cover opacity-30 transition duration-300 group-hover/fact:scale-105 group-hover/fact:opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface)] via-[var(--surface)]/70 to-transparent" />
        </>
      )}
      <div className="relative">
        <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
          {fact.label}
        </div>
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

/**
 * Ligne de classement : cliquable sur toute sa surface quand le joueur a une
 * fiche. Viser le seul pseudo faisait une cible minuscule, surtout au doigt.
 */
function EntryShell({
  playerId,
  title,
  children,
}: {
  playerId: string | null;
  title?: string;
  children: React.ReactNode;
}) {
  const cls =
    "group/entry -mx-1.5 block rounded px-1.5 py-1 transition-colors hover:bg-[var(--table-row-hover)]";
  return playerId ? (
    <Link href={`/joueurs/${playerId}`} className={cls} title={title}>
      {children}
    </Link>
  ) : (
    <div className={cls} title={title}>
      {children}
    </div>
  );
}

/**
 * Carte classement cumulé : top 3, chaque entrée doublée d'une barre.
 *
 * La barre ne dit rien de neuf — elle ré-encode la valeur déjà écrite à droite,
 * mais en longueur : on voit d'un coup d'œil si le premier écrase le classement
 * ou si les trois se tiennent. Les joueurs sont des catégories nominales, donc
 * une seule teinte pour toutes les barres : les colorer par rang doublerait ce
 * que le numéro et la longueur disent déjà.
 */
function LeaderboardCard({ board }: { board: StatLeaderboard }) {
  if (board.entries.length === 0) return null;
  const max = Math.max(...board.entries.map((e) => e.value ?? 0), 0);
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
      <div className="mb-2.5 text-[10px] uppercase tracking-wide text-[var(--accent)]">
        {board.label}
      </div>
      <ol className="flex flex-col gap-2.5">
        {board.entries.map((e, i) => {
          const pct = max > 0 && e.value != null ? Math.max((e.value / max) * 100, 2) : 0;
          return (
            <li key={`${e.playerId ?? e.name}-${i}`}>
              <EntryShell
                playerId={e.playerId}
                title={e.detail ? `${e.name} — ${e.valueLabel} · ${e.detail}` : undefined}
              >
                <div className="flex items-center gap-2 text-sm">
                  <span className="stat w-4 shrink-0 text-right text-xs text-[var(--text-subtle)]">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1 truncate text-white">
                    {e.name}
                    {e.teamTag && (
                      <>
                        <span className="dot-sep">·</span>
                        <span className="text-[var(--text-muted)]">{e.teamTag}</span>
                      </>
                    )}
                  </div>
                  <span className="stat shrink-0 font-semibold text-white">{e.valueLabel}</span>
                </div>
                {pct > 0 && (
                  <div className="mt-1 ml-6 h-1.5 rounded bg-[var(--bg)]">
                    <div
                      className="h-full rounded bg-[var(--accent)] opacity-80 transition-opacity group-hover/entry:opacity-100"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </EntryShell>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * Carte du pool : l'image de la map en fond, la fréquence en avant. Même
 * anatomie que FactCard — c'est la déclinaison « une carte par map ».
 */
function MapPoolCard({ entry }: { entry: MapPoolEntry }) {
  const img = mapSplashUrl(entry.mapName);
  const details = [
    entry.otCount > 0 ? `${entry.otCount} prolongation${entry.otCount > 1 ? "s" : ""}` : null,
    `écart moyen ${entry.avgMargin} rounds`,
  ].filter(Boolean);
  return (
    <div
      className={`group/map relative overflow-hidden rounded-lg border border-[var(--border)] p-3 transition-colors hover:border-[var(--border-strong)] ${
        img ? "" : "bg-[var(--surface)]"
      }`}
    >
      {img && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            loading="lazy"
            decoding="async"
            src={img}
            alt=""
            className="absolute inset-0 h-full w-full scale-100 object-cover opacity-30 transition duration-300 group-hover/map:scale-105 group-hover/map:opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface)] via-[var(--surface)]/70 to-transparent" />
        </>
      )}
      <div className="relative">
        <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
          {entry.mapName}
        </div>
        <div className="stat mt-1.5 text-xl font-bold text-white">
          {entry.played}{" "}
          <span className="text-sm font-semibold">partie{entry.played > 1 ? "s" : ""}</span>
        </div>
        <div className="mt-1.5 truncate text-[11px] text-[var(--accent)]">
          <Detail text={details.join(" · ")} />
        </div>
      </div>
    </div>
  );
}

const SECTION = "mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--accent)]";
const NOTE = "mb-4 text-xs text-[var(--text-muted)]";
const CARD = "rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4";
const GRID = "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4";

export default function TournamentStats({
  tournamentRecords,
  records,
  averages,
  totals,
  players,
  overview,
  agentMeta,
  mapPool,
  margins,
  highlights,
  weapons,
}: {
  tournamentRecords: TournamentFact[];
  records: StatRecord[];
  averages: StatRecord[];
  totals: StatLeaderboard[];
  players: PlayerPoint[];
  overview: TournamentOverview;
  agentMeta: AgentPick[];
  mapPool: MapPoolEntry[];
  margins: MarginBucket[];
  highlights: HighlightStats;
  weapons: WeaponStats;
}) {
  const playedMaps = margins.reduce((n, b) => n + b.count, 0);
  return (
    <div className="space-y-8">
      <section>
        <h2 className={SECTION}>Le tournoi en chiffres</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <StatTile label="Cartes jouées" value={`${overview.mapsPlayed}`} />
          <StatTile label="Rounds" value={overview.rounds.toLocaleString("fr-FR")} />
          <StatTile label="Kills" value={overview.kills.toLocaleString("fr-FR")} />
          <StatTile label="Prolongations" value={`${overview.otMaps}`} />
          <StatTile label="Joueurs" value={`${players.length}`} />
          {overview.durationSec > 0 && (
            <StatTile label="Temps de jeu" value={fmtPlayTime(overview.durationSec)} />
          )}
        </div>
      </section>

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

      {highlights.hasData && (
        <section>
          <h2 className={SECTION}>Clutchs et multikills</h2>
          {highlights.missingMaps > 0 && (
            <p className={NOTE}>
              {highlights.missingMaps} carte{highlights.missingMaps > 1 ? "s" : ""} importée
              {highlights.missingMaps > 1 ? "s" : ""} avant l&apos;ajout de ces données —
              ré-importe-les pour compléter les comptes.
            </p>
          )}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            <BigStatCard record={highlights.biggestClutch} showAgent />
            <LeaderboardCard board={highlights.clutches} />
            <LeaderboardCard board={highlights.multikills} />
            <LeaderboardCard board={highlights.aces} />
          </div>
        </section>
      )}

      {weapons.hasData && (
        <section>
          <h2 className={SECTION}>Les armes</h2>
          {weapons.missingMaps > 0 && (
            <p className={NOTE}>
              {weapons.missingMaps} carte{weapons.missingMaps > 1 ? "s" : ""} importée
              {weapons.missingMaps > 1 ? "s" : ""} avant l&apos;ajout de ces données —
              ré-importe-les pour compléter les comptes.
            </p>
          )}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className={`${CARD} min-w-0`}>
              <WeaponDonut meta={weapons.meta} />
            </div>
            <div className="grid min-w-0 content-start gap-2 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <RifleDuel vandal={weapons.rifles.vandal} phantom={weapons.rifles.phantom} />
              </div>
              <LeaderboardCard board={weapons.operator} />
              <LeaderboardCard board={weapons.melee} />
            </div>
          </div>
        </section>
      )}

      <section>
        <h2 className={SECTION}>Classement des joueurs</h2>
        <div className={CARD}>
          <TournamentPlayerTable players={players} />
        </div>
      </section>

      <section>
        <h2 className={SECTION}>Carte des joueurs</h2>
        <p className={NOTE}>
          Qui frague en restant en vie, qui se sacrifie, qui joue l&apos;appui.
        </p>
        <div className={CARD}>
          <PlayerScatter players={players} />
        </div>
      </section>

      <section>
        <h2 className={SECTION}>Duels d&apos;entry</h2>
        <p className={NOTE}>
          Qui ouvre les rounds et qui les perd d&apos;entry, de part et d&apos;autre de l&apos;axe.
        </p>
        <div className={CARD}>
          <EntryDuels players={players} />
        </div>
      </section>

      {/* Méta et pool côte à côte : les deux répondent à « à quoi ce tournoi
          s'est joué », l'un par les persos, l'autre par les maps. */}
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-6">
        {agentMeta.length > 0 && (
          <section className="min-w-0">
            <h2 className={SECTION}>Méta des persos</h2>
            <div className={CARD}>
              <BarList
                items={agentMeta.slice(0, 8).map((a) => ({
                  key: a.agent,
                  label: a.agent,
                  value: a.picks,
                  note: `${a.pct} %`,
                  icon: <AgentThumb agent={a.agent} size="h-5 w-5" />,
                  title: `${a.agent} — ${a.picks} picks (${a.pct} % des picks)`,
                }))}
              />
            </div>
          </section>
        )}

        {playedMaps > 0 && (
          <section className="min-w-0">
            <h2 className={SECTION}>Physionomie des scores</h2>
            <div className={CARD}>
              <BarList
                items={margins.map((b) => ({
                  key: b.key,
                  label: b.label,
                  value: b.count,
                  note: b.range,
                  title: `${b.label} — ${b.count} carte(s) sur ${playedMaps}`,
                }))}
              />
            </div>
          </section>
        )}
      </div>

      {mapPool.length > 0 && (
        <section>
          <h2 className={SECTION}>Le pool de cartes</h2>
          <div className={GRID}>
            {mapPool.map((m) => (
              <MapPoolCard key={m.mapName} entry={m} />
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
