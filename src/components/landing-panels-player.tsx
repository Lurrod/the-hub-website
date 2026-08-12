import Flag from "@/components/flag";
import { Facts, Panel, PanelHead, Tag, initials } from "@/components/landing-panel-chrome";
import type { ShowcasePlayer } from "@/lib/data/landing-showcase";

/**
 * Les deux maquettes bâties sur une fiche joueur : la fiche elle-même et la
 * carte de partage qu'elle produit. Elles partagent leurs données réelles et
 * le même exemple de repli, d'où ce fichier commun.
 *
 * Voir `landing-panels.tsx` pour la règle générale : données de la base,
 * exemple figé quand la lecture ne rend rien, un seul chemin de rendu.
 */

/* ------------------------------------------------------------------ */

const EXAMPLE_PLAYER: ShowcasePlayer = {
  id: "",
  pseudo: "sylk",
  photo: null,
  nationality: "France",
  qualifier: "Duelliste",
  teamName: "Vermeil",
  age: 19,
  topAgent: { agent: "Jett", pct: 41 },
  kd: 1.24,
  kills: 286,
  deaths: 231,
  bestGame: { kills: 31, opponentTag: "NRD" },
  trend: [0.82, 1.14, 0.97, 1.31, 1.08, 1.44, 1.02, 1.27, 1.36, 1.19, 1.51, 1.42],
  avgRating: 1.21,
  avgAcs: 238,
  mapRecords: [
    { mapName: "Ascent", winratePct: 71, wins: 5, maps: 7 },
    { mapName: "Haven", winratePct: 55, wins: 6, maps: 11 },
    { mapName: "Lotus", winratePct: 40, wins: 2, maps: 5 },
  ],
};

/** Courbe de rating en SVG : polyligne + aire, sur une grille 100x34. */
function Sparkline({ points }: { points: readonly number[] }) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const coords = points.map((v, i) => {
    const x = (i / (points.length - 1)) * 100;
    const y = 32 - ((v - min) / span) * 28;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  return (
    <svg
      viewBox="0 0 100 34"
      preserveAspectRatio="none"
      className="h-16 w-full"
      role="img"
      aria-label={`Courbe de rating des ${points.length} dernières cartes`}
    >
      <polygon points={`0,34 ${coords.join(" ")} 100,34`} fill="var(--accent)" fillOpacity="0.13" />
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--bg)] p-2.5">
      <div className="lf-t10 uppercase tracking-[0.1em] text-[var(--text-subtle)]">{label}</div>
      <div className="stat lf-t13 mt-1 truncate font-semibold text-white">{value}</div>
      <div className="lf-t10 mt-0.5 truncate text-[var(--text-muted)]">{sub}</div>
    </div>
  );
}

/** Éléments d'identité séparés par des points, les manquants simplement omis. */

export function PlayerPanel({ data }: { data: ShowcasePlayer | null }) {
  const p = data ?? EXAMPLE_PLAYER;
  // Une fiche sans équipe ni date de naissance reste lisible : on retire ce
  // qui manque plutôt que de laisser un séparateur orphelin.
  const facts = [p.qualifier, p.teamName, p.age ? `${p.age} ans` : null].filter(
    (f): f is string => !!f
  );

  return (
    <Panel>
      {/* En-tête de fiche : photo, pseudo, drapeau, rôle, équipe. */}
      <div className="flex items-center gap-3">
        <Tag tag={initials(p.pseudo)} logo={p.photo} size="h-11 w-11" />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="lf-t13 truncate font-semibold text-white">{p.pseudo}</span>
            <Flag country={p.nationality} title={false} className="h-3" />
          </div>
          {facts.length > 0 && (
            <div className="lf-t11 mt-0.5 truncate text-[var(--text-muted)]">
              <Facts items={facts} />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Tile
          label="Agent"
          value={p.topAgent?.agent ?? "—"}
          sub={p.topAgent ? `${p.topAgent.pct} % du temps` : "aucun agent relevé"}
        />
        <Tile label="K/D" value={p.kd.toFixed(2)} sub={`${p.kills} / ${p.deaths}`} />
        <Tile
          label="Record"
          value={p.bestGame ? `${p.bestGame.kills} kills` : "—"}
          sub={p.bestGame?.opponentTag ? `vs ${p.bestGame.opponentTag}` : "meilleure partie"}
        />
      </div>

      {/* Deux points au minimum : une polyligne d'un seul point ne trace rien,
          et la division par `length - 1` partirait à l'infini. */}
      {p.trend.length >= 2 && (
        <div>
          <PanelHead
            label={`Rating — ${p.trend.length} dernières cartes`}
            right={
              <span className="stat lf-t10 shrink-0 text-[var(--text-muted)]">
                moy. {p.avgRating.toFixed(2)}
              </span>
            }
          />
          <Sparkline points={p.trend} />
        </div>
      )}

      {p.mapRecords.length > 0 && (
        <div>
          <PanelHead label="Winrate par map" />
          <ul className="mt-2 flex flex-col gap-2">
            {p.mapRecords.map((m) => (
              <li key={m.mapName} className="flex items-center gap-3">
                <span className="lf-t11 w-14 shrink-0 truncate text-[var(--text-muted)]">
                  {m.mapName}
                </span>
                <span className="h-1.5 min-w-0 flex-1 rounded-full bg-[var(--bg)]">
                  <span
                    className="block h-full rounded-full bg-[var(--accent)]"
                    style={{ width: `${m.winratePct}%` }}
                  />
                </span>
                <span className="stat lf-t11 w-8 shrink-0 text-right text-white">
                  {m.winratePct}%
                </span>
                <span className="stat lf-t10 w-7 shrink-0 text-right text-[var(--text-subtle)]">
                  {m.wins}/{m.maps}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* 05 — Carte de partage                                               */
/* ------------------------------------------------------------------ */

/**
 * Rejoue la carte de partage réelle : bandeau de marque et badge en haut,
 * identité au centre, domaine en pied. La composition, les proportions
 * (1200×630) et les rôles de couleur viennent de `lib/og/frame` et
 * `lib/og/fields` — titre en Bricolage blanc, contexte en mono gris, chiffres
 * en mono orange —, ramenés à l'échelle du panneau.
 *
 * Ce n'est volontairement pas l'image elle-même : l'afficher demanderait un
 * rendu Satori par visiteur sur la page la plus servie du site, pour un
 * résultat identique à l'œil.
 *
 * La carte est montrée là où on la voit vraiment, dans un message : c'est ce
 * qui la distingue d'une simple illustration de fiche.
 */
export function SharePanel({ data }: { data: ShowcasePlayer | null }) {
  const p = data ?? EXAMPLE_PLAYER;
  // Même ligne de contexte que la carte réelle : équipe, rôle, nationalité.
  const meta = [p.teamName, p.qualifier, p.nationality].filter((f): f is string => !!f);
  const stats = [`Rating ${p.avgRating.toFixed(2)}`, `ACS ${p.avgAcs}`, `K/D ${p.kd.toFixed(2)}`];

  return (
    <Panel>
      <PanelHead
        label="Carte de partage"
        right={<span className="lf-t10 shrink-0 text-[var(--text-subtle)]">Lien collé</span>}
      />

      {/* Le message qui contient le lien. */}
      <div className="flex min-w-0 gap-2.5">
        <span className="monogram lf-t10 grid h-8 w-8 shrink-0 place-items-center rounded-full font-semibold">
          LU
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="lf-t11 font-semibold text-white">Lurrod</span>
            <span className="lf-t10 text-[var(--text-subtle)]">aujourd&apos;hui</span>
          </div>
          <p className="lf-t11 mt-0.5 truncate text-[var(--accent)]">
            the-hub-vrc.fr/joueurs/{p.pseudo}
          </p>

          {/* L'aperçu déplié, liseré d'accent à gauche comme dans un client de
              discussion. */}
          <div className="mt-2 overflow-hidden rounded-[var(--r-md)] border border-l-2 border-[var(--border)] border-l-[var(--accent)] bg-[var(--bg)]">
            {/* La proportion réelle de la carte (1200×630) n'est tenue qu'à
                partir de `sm` : sous 400 px de large, elle réduirait la
                hauteur au point d'écraser les trois lignes de contenu. En
                dessous, la carte prend la hauteur qu'il lui faut. */}
            <div className="flex min-w-0 flex-col justify-between gap-3 p-3.5 sm:aspect-[1200/630]">
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.png"
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-5 w-5 shrink-0 rounded-[4px] object-cover"
                />
                <span className="stat lf-t10 tracking-[0.22em] text-[var(--accent)]">JOUEUR</span>
              </div>

              <div className="flex min-w-0 flex-col gap-1.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Tag tag={initials(p.pseudo)} logo={p.photo} size="h-10 w-10" />
                  <span className="lf-og-title truncate text-white">{p.pseudo}</span>
                </div>
                {meta.length > 0 && (
                  <span className="stat lf-t10 truncate text-[var(--text-muted)]">
                    {meta.join(" · ")}
                  </span>
                )}
                <span className="stat lf-t11 truncate text-[var(--accent)]">
                  {stats.join(" · ")}
                </span>
              </div>

              <span className="stat lf-t10 text-[var(--accent)]">the-hub-vrc.fr</span>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}
