import Link from "next/link";
import { MIN_MAPS_FOR_AVG } from "@/lib/tournament-stats-core";
import type { PlayerPoint } from "@/lib/data/tournament-stats";

/**
 * Classement complet des joueurs du tournoi, trié au rating.
 *
 * Même seuil que les moyennes (il est partagé, pas recopié) : une seule carte
 * ne fait pas un classement — un remplaçant à 1.60 sur sa game unique
 * passerait devant tout le monde. Si personne n'atteint le seuil (début de
 * tournoi), on montre tout de même tout le monde plutôt qu'un tableau vide.
 */
const MIN_MAPS = MIN_MAPS_FOR_AVG;

/** Ligne d'en-tête calée sur les largeurs des colonnes chiffrées. */
const COLS_HEAD =
  "mb-1.5 flex items-center gap-2 text-[9px] uppercase tracking-wide text-[var(--text-subtle)]";

export default function TournamentPlayerTable({ players }: { players: PlayerPoint[] }) {
  const qualified = players.filter((p) => p.maps >= MIN_MAPS);
  const pool = qualified.length > 0 ? qualified : players;
  const rows = [...pool].sort((a, b) => b.rating - a.rating);
  const maxRating = Math.max(...rows.map((p) => p.rating), 0.01);

  return (
    <div>
      <div className={COLS_HEAD}>
        <span className="w-5 shrink-0 text-right">#</span>
        <span className="min-w-0 flex-1">Joueur</span>
        <span className="hidden min-w-16 flex-1 md:block" aria-hidden />
        <span className="hidden w-10 shrink-0 text-right sm:block">Cartes</span>
        <span className="w-16 shrink-0 text-right">K / D / A</span>
        <span className="hidden w-10 shrink-0 text-right sm:block">ACS</span>
        <span className="hidden w-10 shrink-0 text-right sm:block">KAST</span>
        <span className="w-11 shrink-0 text-right">Rating</span>
      </div>
      <ol className="flex flex-col">
        {rows.map((p, i) => {
          const line = (
            <div className="flex items-center gap-2 text-xs">
              <span className="stat w-5 shrink-0 text-right text-[var(--text-subtle)]">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-white">
                {p.name}
                {p.teamTag && (
                  <>
                    <span className="dot-sep">·</span>
                    <span className="text-[var(--text-muted)]">{p.teamTag}</span>
                  </>
                )}
              </span>
              {/* La barre ré-encode le rating en longueur : l'écart entre le
                  haut et le ventre du classement se voit sans lire un chiffre. */}
              <span className="hidden h-1.5 min-w-16 flex-1 rounded bg-[var(--bg)] md:block">
                <span
                  className="block h-full rounded bg-[var(--accent)] opacity-80 transition-opacity group-hover/row:opacity-100"
                  style={{ width: `${Math.max((p.rating / maxRating) * 100, 2)}%` }}
                />
              </span>
              <span className="stat hidden w-10 shrink-0 text-right text-[var(--text-muted)] sm:block">
                {p.maps}
              </span>
              <span className="stat w-16 shrink-0 text-right text-white">
                {p.kills}/{p.deaths}/{p.assists}
              </span>
              <span className="stat hidden w-10 shrink-0 text-right text-white sm:block">
                {p.acs}
              </span>
              <span className="stat hidden w-10 shrink-0 text-right text-[var(--text-muted)] sm:block">
                {p.kast}%
              </span>
              <span className="stat w-11 shrink-0 text-right font-semibold text-[var(--accent)]">
                {p.rating.toFixed(2)}
              </span>
            </div>
          );
          const cls =
            "group/row -mx-1.5 block rounded px-1.5 py-1.5 transition-colors hover:bg-[var(--table-row-hover)]";
          return (
            <li key={p.playerId ?? `${p.name}-${i}`}>
              {p.playerId ? (
                <Link href={`/joueurs/${p.playerId}`} className={cls}>
                  {line}
                </Link>
              ) : (
                <div className={cls}>{line}</div>
              )}
            </li>
          );
        })}
      </ol>
      {qualified.length > 0 && qualified.length < players.length && (
        <p className="mt-2 text-[10px] text-[var(--text-subtle)]">
          Min. {MIN_MAPS} cartes jouées — {players.length - qualified.length} joueur(s) hors
          classement.
        </p>
      )}
    </div>
  );
}
