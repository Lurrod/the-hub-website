import type { PlayerPoint } from "@/lib/data/tournament-stats";

/** Nombre de joueurs affichés. Le reste est annoncé sous le graphique. */
const TOP = 8;

/**
 * Couleurs des deux pôles. `--accent` est l'orange du site ; le bleu est son
 * opposé chaud/froid, validé avec lui : ΔE 23.5 en protanopie, 30.8 en vision
 * normale, contraste supérieur à 3:1 sur la surface. Le couple succès/destructif
 * du site tombait lui à 5.4 en deutéranopie — inutilisable pour deux séries.
 */
const WON = "var(--accent)";
const LOST = "#3b9ad6";

/**
 * Duels d'entry : premiers kills à droite, premières morts à gauche, de part
 * et d'autre d'un axe commun.
 *
 * La polarité est le sujet — gagner ou perdre l'ouverture — donc deux teintes
 * opposées et un axe central. La position dit déjà de quel côté on est ; la
 * couleur et la légende ne font que confirmer.
 */
export default function EntryDuels({ players }: { players: PlayerPoint[] }) {
  const ranked = players
    .filter((p) => p.firstKills + p.firstDeaths > 0)
    .sort(
      (a, b) =>
        b.firstKills - b.firstDeaths - (a.firstKills - a.firstDeaths) || b.firstKills - a.firstKills
    );
  const shown = ranked.slice(0, TOP);
  const hidden = ranked.length - shown.length;

  if (shown.length === 0) {
    return <p className="text-sm text-[var(--text-muted)]">Aucun duel d&apos;entry enregistré.</p>;
  }

  const max = Math.max(...shown.map((p) => Math.max(p.firstKills, p.firstDeaths)), 1);

  return (
    <figure className="m-0">
      {/* Deux séries : une légende est obligatoire, l'identité ne peut pas
          reposer sur la seule couleur. */}
      <div className="mb-3 flex items-center gap-4 text-[11px] text-[var(--text-muted)]">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: LOST }} aria-hidden />
          Premières morts
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: WON }} aria-hidden />
          Premiers kills
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {shown.map((p, i) => {
          const diff = p.firstKills - p.firstDeaths;
          return (
            <li
              key={`${p.playerId ?? p.name}-${i}`}
              className="flex items-center gap-2 text-xs"
              title={`${p.name} — ${p.firstKills} premiers kills, ${p.firstDeaths} premières morts (${diff > 0 ? "+" : ""}${diff})`}
            >
              <span className="w-24 shrink-0 truncate text-right text-white sm:w-32">{p.name}</span>

              {/* Les compteurs suivent le bout de leur barre plutot que de rester
                  colles au nom : sinon un chiffre flotte loin de ce qu'il mesure. */}
              <div className="flex min-w-0 flex-1 items-center">
                <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
                  <span className="stat shrink-0 text-[10px] text-[var(--text-muted)]">
                    {p.firstDeaths || ""}
                  </span>
                  <div
                    className="h-3 shrink-0 rounded-l"
                    style={{
                      width: `${(p.firstDeaths / max) * 100}%`,
                      backgroundColor: LOST,
                    }}
                  />
                </div>

                {/* 2px de surface de chaque cote de l'axe : les marques ne se touchent pas. */}
                <div className="mx-0.5 h-4 w-px shrink-0 bg-[var(--border-strong)]" aria-hidden />

                <div className="flex min-w-0 flex-1 items-center gap-1.5">
                  <div
                    className="h-3 shrink-0 rounded-r"
                    style={{
                      width: `${(p.firstKills / max) * 100}%`,
                      backgroundColor: WON,
                    }}
                  />
                  <span className="stat shrink-0 text-[10px] text-[var(--text-muted)]">
                    {p.firstKills || ""}
                  </span>
                </div>
              </div>

              <span
                className={`stat w-8 shrink-0 text-right font-semibold ${
                  diff > 0 ? "text-white" : "text-[var(--text-muted)]"
                }`}
              >
                {diff > 0 ? `+${diff}` : diff}
              </span>
            </li>
          );
        })}
      </ul>

      <figcaption className="mt-2 text-[11px] text-[var(--text-muted)]">
        Classé par différentiel.
        {hidden > 0 &&
          ` ${hidden} autre${hidden > 1 ? "s" : ""} joueur${hidden > 1 ? "s" : ""} non affiché${hidden > 1 ? "s" : ""}.`}
      </figcaption>
    </figure>
  );
}
