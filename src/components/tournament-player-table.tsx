import Link from "next/link";
import { MIN_MAPS_FOR_AVG } from "@/lib/tournament-stats-core";
import type { PlayerPoint } from "@/lib/data/tournament-stats";
import { fichePath } from "@/lib/slug";

/**
 * Classement complet des joueurs du tournoi, trié au rating.
 *
 * Même seuil que les moyennes (il est partagé, pas recopié) : une seule carte
 * ne fait pas un classement — un remplaçant à 1.60 sur sa game unique
 * passerait devant tout le monde. Si personne n'atteint le seuil (début de
 * tournoi), on montre tout de même tout le monde plutôt qu'un tableau vide.
 *
 * Rendu en `<table>` et non en liste de `<div>` : les colonnes étaient des
 * `<span>` alignés à la largeur, sans aucune association ligne/colonne. Un
 * lecteur d'écran énonçait donc une suite de nombres nus — sur des statistiques
 * (cartes, K/D/A, ACS, KAST, rating), c'est inexploitable. Le reste du projet
 * utilise déjà `<th scope>` partout ailleurs.
 *
 * Le lien vit dans la cellule du nom et non autour de la ligne : un `<tr>` ne
 * peut pas être enveloppé dans un `<a>`. C'est le motif déjà retenu par
 * `player-directory.tsx`.
 */
const MIN_MAPS = MIN_MAPS_FOR_AVG;

const TH = "py-2 font-medium text-[9px] uppercase tracking-wide";
const TD = "py-1.5 align-middle";

export default function TournamentPlayerTable({ players }: { players: PlayerPoint[] }) {
  const qualified = players.filter((p) => p.maps >= MIN_MAPS);
  const pool = qualified.length > 0 ? qualified : players;
  const rows = [...pool].sort((a, b) => b.rating - a.rating);
  const maxRating = Math.max(...rows.map((p) => p.rating), 0.01);

  return (
    <div>
      <div
        className="overflow-x-auto"
        tabIndex={0}
        role="region"
        aria-label="Classement des joueurs, défilement horizontal"
      >
        <table className="w-full min-w-[420px] text-xs">
          <thead>
            <tr className="text-left text-[var(--text-subtle)]">
              <th scope="col" className={`${TH} w-8 pr-2 text-right`}>
                #
              </th>
              <th scope="col" className={`${TH} pr-2`}>
                Joueur
              </th>
              {/* Colonne de la barre : purement visuelle, elle ne porte aucune
                  donnée que les chiffres ne disent déjà. */}
              <th className="hidden md:table-cell" aria-hidden />
              <th scope="col" className={`${TH} hidden w-12 pr-2 text-right sm:table-cell`}>
                Cartes
              </th>
              <th scope="col" className={`${TH} w-20 pr-2 text-right`}>
                K / D / A
              </th>
              <th scope="col" className={`${TH} hidden w-12 pr-2 text-right sm:table-cell`}>
                ACS
              </th>
              <th scope="col" className={`${TH} hidden w-12 pr-2 text-right sm:table-cell`}>
                KAST
              </th>
              <th scope="col" className={`${TH} w-14 text-right`}>
                Rating
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p, i) => (
              <tr
                key={p.playerId ?? `${p.name}-${i}`}
                className="group/row transition-colors hover:bg-[var(--table-row-hover)]"
              >
                <td className={`stat ${TD} pr-2 text-right text-[var(--text-subtle)]`}>{i + 1}</td>
                <th scope="row" className={`${TD} min-w-0 pr-2 text-left font-normal`}>
                  {p.playerId ? (
                    <Link
                      href={fichePath("joueurs", p.playerId, p.name)}
                      className="block truncate text-white hover:underline"
                    >
                      {p.name}
                      {p.teamTag && (
                        <>
                          <span className="dot-sep">·</span>
                          <span className="text-[var(--text-muted)]">{p.teamTag}</span>
                        </>
                      )}
                    </Link>
                  ) : (
                    <span className="block truncate text-white">
                      {p.name}
                      {p.teamTag && (
                        <>
                          <span className="dot-sep">·</span>
                          <span className="text-[var(--text-muted)]">{p.teamTag}</span>
                        </>
                      )}
                    </span>
                  )}
                </th>
                {/* La barre ré-encode le rating en longueur : l'écart entre le
                    haut et le ventre du classement se voit sans lire un chiffre. */}
                <td className={`${TD} hidden w-full pr-2 md:table-cell`} aria-hidden>
                  <span className="block h-1.5 rounded bg-[var(--bg)]">
                    <span
                      className="block h-full rounded bg-[var(--accent)] opacity-80 transition-opacity group-hover/row:opacity-100"
                      style={{ width: `${Math.max((p.rating / maxRating) * 100, 2)}%` }}
                    />
                  </span>
                </td>
                <td
                  className={`stat ${TD} hidden pr-2 text-right text-[var(--text-muted)] sm:table-cell`}
                >
                  {p.maps}
                </td>
                <td className={`stat ${TD} pr-2 text-right text-white`}>
                  {p.kills}/{p.deaths}/{p.assists}
                </td>
                <td className={`stat ${TD} hidden pr-2 text-right text-white sm:table-cell`}>
                  {p.acs}
                </td>
                <td
                  className={`stat ${TD} hidden pr-2 text-right text-[var(--text-muted)] sm:table-cell`}
                >
                  {p.kast}%
                </td>
                <td className={`stat ${TD} text-right font-semibold text-[var(--accent)]`}>
                  {p.rating.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {qualified.length > 0 && qualified.length < players.length && (
        <p className="mt-2 text-[10px] text-[var(--text-subtle)]">
          Min. {MIN_MAPS} cartes jouées — {players.length - qualified.length} joueur(s) hors
          classement.
        </p>
      )}
    </div>
  );
}
