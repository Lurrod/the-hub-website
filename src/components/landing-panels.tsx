import AgentIcon from "@/components/agent-icon";
import Flag from "@/components/flag";

/**
 * Maquettes de la landing : chaque bloc de fonctionnalité est illustré par un
 * fragment de l'interface réelle, rejoué en HTML plutôt que capturé en image.
 *
 * Pourquoi pas des captures d'écran : une maquette en HTML reste nette à tous
 * les zooms, suit la charte quand un jeton change, se traduit, et ne demande
 * aucun asset à régénérer à chaque évolution de l'interface. Le prix à payer
 * est ce fichier : des données figées, purement décoratives.
 *
 * Les équipes et les pseudos sont inventés. On ne met pas de vraies structures
 * en vitrine sans leur accord, et les chiffres affichés ne sont pas des
 * résultats réels.
 */

/** Coquille commune : cadre, nappe d'accent, trame de points (cf. `.lf-panel`). */
function Panel({ children }: { children: React.ReactNode }) {
  return (
    // `min-w-0` : sans lui, une maquette plus large que la colonne (le tableau
    // de scoreboard sur petit écran) impose sa largeur de contenu à la grille
    // et fait déborder la page entière au lieu d'être contenue.
    <div className="lf-panel min-w-0 p-4 sm:p-5">
      <div className="flex min-w-0 flex-col gap-3">{children}</div>
    </div>
  );
}

/** Bandeau de titre interne, repris de l'en-tête des sections du site. */
function PanelHead({ label, right }: { label: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="lf-t10 font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
        {label}
      </span>
      {right}
    </div>
  );
}

/** Pastille de logo d'équipe : même rendu que `.monogram` ailleurs sur le site. */
function Tag({ tag, size = "h-7 w-7" }: { tag: string; size?: string }) {
  return (
    <span
      className={`monogram lf-t10 inline-grid ${size} shrink-0 place-items-center rounded-[6px] font-semibold`}
    >
      {tag}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* 01 — Scoreboard                                                     */
/* ------------------------------------------------------------------ */

type Line = {
  agent: string;
  pseudo: string;
  rating: number;
  acs: number;
  k: number;
  d: number;
  a: number;
  kast: number;
  adr: number;
};

const SCOREBOARD: readonly Line[] = [
  { agent: "Jett", pseudo: "sylk", rating: 1.42, acs: 289, k: 24, d: 14, a: 5, kast: 78, adr: 168 },
  {
    agent: "Sova",
    pseudo: "noax",
    rating: 1.18,
    acs: 231,
    k: 19,
    d: 15,
    a: 11,
    kast: 74,
    adr: 149,
  },
  {
    agent: "Omen",
    pseudo: "tchek",
    rating: 1.05,
    acs: 204,
    k: 16,
    d: 15,
    a: 9,
    kast: 78,
    adr: 132,
  },
  {
    agent: "Killjoy",
    pseudo: "orya",
    rating: 0.94,
    acs: 178,
    k: 13,
    d: 16,
    a: 6,
    kast: 65,
    adr: 121,
  },
  {
    agent: "Sage",
    pseudo: "mevi",
    rating: 0.81,
    acs: 151,
    k: 11,
    d: 18,
    a: 12,
    kast: 61,
    adr: 108,
  },
];

/**
 * Colonnes chiffrées, en-tête et cellule décrites au même endroit pour qu'elles
 * ne puissent pas se désynchroniser.
 *
 * `narrow: false` retire la colonne sous `sm` : les sept colonnes ne tiennent
 * pas dans 390 px et débordaient la page de douze pixels. On sacrifie les deux
 * moins parlantes hors contexte plutôt que d'imposer un défilement latéral
 * dans une vitrine.
 */
const COLS: readonly {
  key: string;
  cell: (l: Line) => string;
  narrow: boolean;
  strong?: boolean;
}[] = [
  { key: "R", cell: (l) => l.rating.toFixed(2), narrow: true, strong: true },
  { key: "ACS", cell: (l) => String(l.acs), narrow: true },
  { key: "K", cell: (l) => String(l.k), narrow: true },
  { key: "D", cell: (l) => String(l.d), narrow: true },
  { key: "A", cell: (l) => String(l.a), narrow: false },
  { key: "KAST", cell: (l) => `${l.kast}%`, narrow: false },
  { key: "ADR", cell: (l) => String(l.adr), narrow: true },
];

export function ScoreboardPanel() {
  return (
    <Panel>
      <PanelHead
        label="Scoreboard"
        right={
          <span className="lf-t10 text-[var(--text-subtle)]">
            Ascent <span className="dot-sep">·</span> carte 2 sur 3
          </span>
        }
      />

      {/* Bandeau « versus », repris de l'en-tête d'une fiche match. */}
      <div className="flex items-center justify-between gap-3 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Tag tag="VRM" />
          <span className="lf-t13 truncate font-semibold text-white">Vermeil</span>
        </div>
        <div className="stat lf-t18 flex shrink-0 items-center gap-2 font-semibold">
          <span className="text-[var(--accent)]">13</span>
          <span className="text-[var(--text-subtle)]">:</span>
          <span className="text-[var(--text-muted)]">9</span>
        </div>
        <div className="flex min-w-0 items-center justify-end gap-2">
          <span className="lf-t13 truncate font-semibold text-[var(--text-muted)]">Nordique</span>
          <Tag tag="NRD" />
        </div>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th
              scope="col"
              className="lf-t10 pb-1.5 text-left font-medium text-[var(--text-subtle)]"
            >
              Joueur
            </th>
            {COLS.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={`lf-t10 pb-1.5 text-right font-medium text-[var(--text-subtle)] ${
                  c.narrow ? "" : "hidden sm:table-cell"
                }`}
              >
                {c.key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SCOREBOARD.map((l) => (
            <tr key={l.pseudo} className="border-b border-[var(--border)] last:border-0">
              <td className="py-1.5 pr-2">
                <span className="flex items-center gap-2">
                  <AgentIcon agent={l.agent} size="h-5 w-5" />
                  <span className="lf-t11 truncate text-white">{l.pseudo}</span>
                </span>
              </td>
              {COLS.map((c) => (
                <td
                  key={c.key}
                  className={`stat lf-t11 py-1.5 pl-2 text-right ${
                    c.narrow ? "" : "hidden sm:table-cell"
                  } ${
                    // Le rating porte la lecture de la ligne : au-dessus de 1,
                    // il passe en blanc, comme sur la vraie fiche match.
                    c.strong
                      ? `font-semibold ${l.rating >= 1 ? "text-white" : "text-[var(--text-muted)]"}`
                      : "text-[var(--text-muted)]"
                  }`}
                >
                  {c.cell(l)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* 02 — Fiche joueur                                                   */
/* ------------------------------------------------------------------ */

/** Points de la courbe de rating : une valeur par carte, la plus ancienne d'abord. */
const TREND = [0.82, 1.14, 0.97, 1.31, 1.08, 1.44, 1.02, 1.27, 1.36, 1.19, 1.51, 1.42];

const MAP_WINRATE = [
  { map: "Ascent", pct: 71, record: "5/7" },
  { map: "Haven", pct: 55, record: "6/11" },
  { map: "Lotus", pct: 40, record: "2/5" },
];

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
      aria-label="Courbe de rating des douze dernières cartes, orientée à la hausse"
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
      <div className="stat lf-t13 mt-1 font-semibold text-white">{value}</div>
      <div className="lf-t10 mt-0.5 truncate text-[var(--text-muted)]">{sub}</div>
    </div>
  );
}

export function PlayerPanel() {
  return (
    <Panel>
      {/* En-tête de fiche : pastille, pseudo, drapeau, rôle, équipe. */}
      <div className="flex items-center gap-3">
        <Tag tag="SY" size="h-11 w-11" />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="lf-t13 truncate font-semibold text-white">sylk</span>
            <Flag country="France" title={false} className="h-3" />
          </div>
          <div className="lf-t11 mt-0.5 text-[var(--text-muted)]">
            Duelliste <span className="dot-sep">·</span> Vermeil <span className="dot-sep">·</span>{" "}
            19 ans
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Tile label="Agent" value="Jett" sub="41 % du temps" />
        <Tile label="K/D" value="1,24" sub="286 / 231" />
        <Tile label="Record" value="31 kills" sub="vs NRD" />
      </div>

      <div>
        <PanelHead
          label="Rating — 12 dernières cartes"
          right={<span className="stat lf-t10 text-[var(--text-muted)]">moy. 1,21</span>}
        />
        <Sparkline points={TREND} />
      </div>

      <div>
        <PanelHead label="Winrate par map" />
        <ul className="mt-2 flex flex-col gap-2">
          {MAP_WINRATE.map((m) => (
            <li key={m.map} className="flex items-center gap-3">
              <span className="lf-t11 w-14 shrink-0 text-[var(--text-muted)]">{m.map}</span>
              <span className="h-1.5 min-w-0 flex-1 rounded-full bg-[var(--bg)]">
                <span
                  className="block h-full rounded-full bg-[var(--accent)]"
                  style={{ width: `${m.pct}%` }}
                />
              </span>
              <span className="stat lf-t11 w-8 shrink-0 text-right text-white">{m.pct}%</span>
              <span className="stat lf-t10 w-7 shrink-0 text-right text-[var(--text-subtle)]">
                {m.record}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* 03 — Tournoi                                                        */
/* ------------------------------------------------------------------ */

type Seat = { tag: string; name: string; score: number };

/** Une confrontation du bracket : le vainqueur est celui qui a le meilleur score. */
function Bout({ top, bottom }: { top: Seat; bottom: Seat }) {
  const rows = [top, bottom];
  const winner = top.score > bottom.score ? top.tag : bottom.tag;
  return (
    <div className="overflow-hidden rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--bg)]">
      {rows.map((s, i) => {
        const won = s.tag === winner;
        return (
          <div
            key={s.tag}
            className={`flex items-center justify-between gap-2 px-2.5 py-2 ${
              i === 0 ? "border-b border-[var(--border)]" : ""
            }`}
          >
            <span className="flex min-w-0 items-center gap-2">
              <Tag tag={s.tag} size="h-5 w-5" />
              <span
                className={`lf-t11 truncate ${won ? "text-white" : "text-[var(--text-muted)]"}`}
              >
                {s.name}
              </span>
            </span>
            <span
              className={`stat lf-t11 shrink-0 font-semibold ${
                won ? "text-[var(--accent)]" : "text-[var(--text-subtle)]"
              }`}
            >
              {s.score}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Étiquette de tour, alignée d'une colonne à l'autre du bracket. */
function Round({ label }: { label: string }) {
  return (
    <span className="lf-t10 uppercase tracking-[0.16em] text-[var(--text-subtle)]">{label}</span>
  );
}

export function TournamentPanel() {
  return (
    <Panel>
      {/* Bandeau de tournoi : logo, nom, statut, format, dotation. */}
      <div className="flex items-center gap-3 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--category)] px-3 py-2.5">
        <Tag tag="HO" size="h-9 w-9" />
        <div className="min-w-0 flex-1">
          <div className="lf-t13 truncate font-semibold text-white">Hub Open #3</div>
          <div className="lf-t10 mt-0.5 text-[var(--text-muted)]">
            Double élimination <span className="dot-sep">·</span> 16 équipes{" "}
            <span className="dot-sep">·</span> 500 €
          </div>
        </div>
        <span className="lf-t10 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--accent)] px-2 py-1 font-semibold uppercase tracking-[0.1em] text-[var(--accent)]">
          <span className="live-dot" aria-hidden="true" />
          En cours
        </span>
      </div>

      {/* Les étiquettes de tour vivent sur leur propre ligne, avec le même
          gabarit de colonnes : sinon la « Finale » descend au centre de sa
          colonne, plus courte, et les deux libellés ne s'alignent plus. */}
      <div className="grid grid-cols-[1fr_24px_1fr] gap-2">
        <Round label="Demi-finales" />
        <span />
        <Round label="Finale" />
      </div>

      <div className="grid grid-cols-[1fr_24px_1fr] items-center gap-2">
        <div className="flex flex-col gap-3">
          <Bout
            top={{ tag: "VRM", name: "Vermeil", score: 2 }}
            bottom={{ tag: "CLQ", name: "Calanques", score: 0 }}
          />
          <Bout
            top={{ tag: "ASC", name: "Ascension", score: 1 }}
            bottom={{ tag: "NRD", name: "Nordique", score: 2 }}
          />
        </div>

        {/* Embranchements vers la finale. Le tracé est en pourcentages de la
            hauteur de la colonne : deux confrontations de même gabarit ont
            leurs centres à 22,5 % et 77,5 %, quelle que soit la hauteur réelle
            des lignes. `preserveAspectRatio="none"` étire donc juste. */}
        <svg
          viewBox="0 0 24 100"
          preserveAspectRatio="none"
          className="h-full w-6 self-stretch text-[var(--border-strong)]"
          aria-hidden="true"
        >
          <path
            d="M0 22.5 H12 V50 H24 M0 77.5 H12 V50"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <Bout
          top={{ tag: "VRM", name: "Vermeil", score: 3 }}
          bottom={{ tag: "NRD", name: "Nordique", score: 1 }}
        />
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* 04 — Recrutement                                                    */
/* ------------------------------------------------------------------ */

type Ad = { tag: string; name: string; kind: "LFT" | "LFP"; facts: readonly string[] };

const ADS: readonly Ad[] = [
  { tag: "SY", name: "sylk", kind: "LFT", facts: ["Duelliste", "Immortal 2", "soirs de semaine"] },
  {
    tag: "NRD",
    name: "Nordique",
    kind: "LFP",
    facts: ["Cherche IGL", "Ascendant 3+", "3 soirs / semaine"],
  },
  { tag: "KO", name: "koben", kind: "LFT", facts: ["Coach", "2 saisons en division 2"] },
];

export function RecruitPanel() {
  return (
    <Panel>
      <PanelHead
        label="Annonces"
        right={
          <span className="lf-t10 text-[var(--text-subtle)]">
            Filtrées par rôle, rang et région
          </span>
        }
      />
      <ul className="flex flex-col gap-2">
        {ADS.map((a) => (
          <li
            key={a.name}
            className="flex items-center gap-3 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5"
          >
            <Tag tag={a.tag} size="h-9 w-9" />
            <div className="min-w-0 flex-1">
              <div className="lf-t13 truncate font-semibold text-white">{a.name}</div>
              <div className="lf-t10 mt-0.5 truncate text-[var(--text-muted)]">
                {a.facts.map((fact, i) => (
                  <span key={fact}>
                    {i > 0 && <span className="dot-sep">·</span>}
                    {fact}
                  </span>
                ))}
              </div>
            </div>
            <span
              className={`lf-t10 shrink-0 rounded-full border px-2 py-1 font-semibold tracking-[0.1em] ${
                a.kind === "LFT"
                  ? "border-[var(--accent)] text-[var(--accent)]"
                  : "border-[var(--border-strong)] text-[var(--text-muted)]"
              }`}
            >
              {a.kind}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
