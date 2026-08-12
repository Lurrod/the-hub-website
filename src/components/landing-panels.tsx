import AgentIcon from "@/components/agent-icon";
import Flag from "@/components/flag";
import type {
  ShowcaseAd,
  ShowcaseBout,
  ShowcasePlayer,
  ShowcaseScoreboard,
  ShowcaseTeam,
  ShowcaseTournament,
} from "@/lib/data/landing-showcase";

/**
 * Maquettes de la landing : chaque bloc de fonctionnalité est illustré par un
 * fragment de l'interface réelle, rejoué en HTML plutôt que capturé en image.
 *
 * Pourquoi pas des captures d'écran : une maquette en HTML reste nette à tous
 * les zooms, suit la charte quand un jeton change, se traduit, et ne demande
 * aucun asset à régénérer à chaque évolution de l'interface.
 *
 * Ces maquettes sont alimentées par la base (`lib/data/landing-showcase`) :
 * en production, ce sont les vrais matchs, fiches et annonces du site.
 *
 * Chaque panneau garde néanmoins un exemple figé, utilisé quand la requête ne
 * rend rien — site neuf, statistiques pas encore importées, base
 * momentanément indisponible. Un cadre vide en vitrine dirait qu'il n'y a rien
 * à voir, ce qui est faux. Les exemples ont la forme exacte des données
 * réelles, si bien qu'il n'existe qu'un seul chemin de rendu.
 *
 * Les équipes et les pseudos de ces exemples sont inventés : on ne met pas de
 * vraies structures en vitrine par défaut, et leurs chiffres ne sont pas des
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

/**
 * Pastille d'entité : le logo quand il y en a un, sinon le monogramme, comme
 * partout ailleurs sur le site (`.monogram`).
 */
function Tag({
  tag,
  logo = null,
  size = "h-7 w-7",
}: {
  tag: string;
  logo?: string | null;
  size?: string;
}) {
  if (logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logo}
        alt=""
        loading="lazy"
        decoding="async"
        className={`${size} shrink-0 rounded-[6px] object-cover`}
      />
    );
  }
  return (
    <span
      className={`monogram lf-t10 inline-grid ${size} shrink-0 place-items-center rounded-[6px] font-semibold`}
    >
      {tag}
    </span>
  );
}

/** Deux premières lettres d'un nom, faute de logo. */
const initials = (name: string) => name.slice(0, 2).toUpperCase();

/* ------------------------------------------------------------------ */
/* 01 — Scoreboard                                                     */
/* ------------------------------------------------------------------ */

const EXAMPLE_SCOREBOARD: ShowcaseScoreboard = {
  matchId: "",
  teamA: { tag: "VRM", name: "Vermeil", logo: null },
  teamB: { tag: "NRD", name: "Nordique", logo: null },
  mapName: "Ascent",
  mapIndex: 2,
  mapCount: 3,
  roundsA: 13,
  roundsB: 9,
  lines: [
    {
      pseudo: "sylk",
      agent: "Jett",
      rating: 1.42,
      acs: 289,
      kills: 24,
      deaths: 14,
      assists: 5,
      kast: 78,
      adr: 168,
    },
    {
      pseudo: "noax",
      agent: "Sova",
      rating: 1.18,
      acs: 231,
      kills: 19,
      deaths: 15,
      assists: 11,
      kast: 74,
      adr: 149,
    },
    {
      pseudo: "tchek",
      agent: "Omen",
      rating: 1.05,
      acs: 204,
      kills: 16,
      deaths: 15,
      assists: 9,
      kast: 78,
      adr: 132,
    },
    {
      pseudo: "orya",
      agent: "Killjoy",
      rating: 0.94,
      acs: 178,
      kills: 13,
      deaths: 16,
      assists: 6,
      kast: 65,
      adr: 121,
    },
    {
      pseudo: "mevi",
      agent: "Sage",
      rating: 0.81,
      acs: 151,
      kills: 11,
      deaths: 18,
      assists: 12,
      kast: 61,
      adr: 108,
    },
  ],
};

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
  cell: (l: ShowcaseScoreboard["lines"][number]) => string;
  narrow: boolean;
  strong?: boolean;
}[] = [
  { key: "R", cell: (l) => l.rating.toFixed(2), narrow: true, strong: true },
  { key: "ACS", cell: (l) => String(l.acs), narrow: true },
  { key: "K", cell: (l) => String(l.kills), narrow: true },
  { key: "D", cell: (l) => String(l.deaths), narrow: true },
  { key: "A", cell: (l) => String(l.assists), narrow: false },
  { key: "KAST", cell: (l) => `${l.kast}%`, narrow: false },
  { key: "ADR", cell: (l) => String(l.adr), narrow: true },
];

export function ScoreboardPanel({ data }: { data: ShowcaseScoreboard | null }) {
  const s = data ?? EXAMPLE_SCOREBOARD;
  const aWon = s.roundsA >= s.roundsB;

  return (
    <Panel>
      <PanelHead
        label="Scoreboard"
        right={
          <span className="lf-t10 truncate text-[var(--text-subtle)]">
            {s.mapName}
            {/* « carte 1 sur 1 » ne dit rien : le rang n'a de sens qu'en série. */}
            {s.mapCount > 1 && (
              <>
                <span className="dot-sep">·</span>carte {s.mapIndex} sur {s.mapCount}
              </>
            )}
          </span>
        }
      />

      {/* Bandeau « versus », repris de l'en-tête d'une fiche match. */}
      <div className="flex items-center justify-between gap-3 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Tag tag={s.teamA.tag} logo={s.teamA.logo} />
          <span className="lf-t13 truncate font-semibold text-white">{s.teamA.name}</span>
        </div>
        <div className="stat lf-t18 flex shrink-0 items-center gap-2 font-semibold">
          <span className={aWon ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}>
            {s.roundsA}
          </span>
          <span className="text-[var(--text-subtle)]">:</span>
          <span className={aWon ? "text-[var(--text-muted)]" : "text-[var(--accent)]"}>
            {s.roundsB}
          </span>
        </div>
        <div className="flex min-w-0 items-center justify-end gap-2">
          <span className="lf-t13 truncate font-semibold text-[var(--text-muted)]">
            {s.teamB.name}
          </span>
          <Tag tag={s.teamB.tag} logo={s.teamB.logo} />
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
          {s.lines.map((l) => (
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
function Facts({ items }: { items: readonly string[] }) {
  return (
    <>
      {items.map((f, i) => (
        <span key={f}>
          {i > 0 && <span className="dot-sep">·</span>}
          {f}
        </span>
      ))}
    </>
  );
}

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
/* 03 — Tournoi                                                        */
/* ------------------------------------------------------------------ */

const EXAMPLE_TOURNAMENT: ShowcaseTournament = {
  id: "",
  name: "Hub Open #3",
  logo: null,
  format: "Double élimination",
  status: "ONGOING",
  statusLabel: "En cours",
  teamCount: 16,
  prizePool: "500 €",
  semisLabel: "Demi-finales",
  finalLabel: "Finale",
  semis: [
    {
      top: { tag: "VRM", name: "Vermeil", logo: null, score: 2 },
      bottom: { tag: "CLQ", name: "Calanques", logo: null, score: 0 },
    },
    {
      top: { tag: "ASC", name: "Ascension", logo: null, score: 1 },
      bottom: { tag: "NRD", name: "Nordique", logo: null, score: 2 },
    },
  ],
  final: {
    top: { tag: "VRM", name: "Vermeil", logo: null, score: 3 },
    bottom: { tag: "NRD", name: "Nordique", logo: null, score: 1 },
  },
};

/** Une confrontation du bracket : le vainqueur est celui qui a le meilleur score. */
function Bout({ bout }: { bout: ShowcaseBout }) {
  const rows: readonly (ShowcaseTeam & { score: number })[] = [bout.top, bout.bottom];
  // On départage sur les scores, pas sur les tags : deux équipes peuvent
  // porter le même tag, rien ne l'interdit en base. Une égalité — un match
  // encore en cours de saisie — ne désigne aucun vainqueur.
  const winner =
    bout.top.score === bout.bottom.score ? -1 : bout.top.score > bout.bottom.score ? 0 : 1;

  return (
    <div className="overflow-hidden rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--bg)]">
      {rows.map((s, i) => {
        const won = i === winner;
        return (
          <div
            key={i}
            className={`flex items-center justify-between gap-2 px-2.5 py-2 ${
              i === 0 ? "border-b border-[var(--border)]" : ""
            }`}
          >
            <span className="flex min-w-0 items-center gap-2">
              <Tag tag={s.tag} logo={s.logo} size="h-5 w-5" />
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
    <span className="lf-t10 block truncate uppercase tracking-[0.16em] text-[var(--text-subtle)]">
      {label}
    </span>
  );
}

export function TournamentPanel({ data }: { data: ShowcaseTournament | null }) {
  const t = data ?? EXAMPLE_TOURNAMENT;
  const facts = [
    t.format,
    `${t.teamCount} équipe${t.teamCount > 1 ? "s" : ""}`,
    t.prizePool,
  ].filter((f): f is string => !!f);

  return (
    <Panel>
      {/* Bandeau de tournoi : logo, nom, statut, format, dotation. */}
      <div className="flex items-center gap-3 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--category)] px-3 py-2.5">
        <Tag tag={initials(t.name)} logo={t.logo} size="h-9 w-9" />
        <div className="min-w-0 flex-1">
          <div className="lf-t13 truncate font-semibold text-white">{t.name}</div>
          <div className="lf-t10 mt-0.5 truncate text-[var(--text-muted)]">
            <Facts items={facts} />
          </div>
        </div>
        <span
          className={`lf-t10 inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 font-semibold uppercase tracking-[0.1em] ${
            t.status === "ONGOING"
              ? "border-[var(--accent)] text-[var(--accent)]"
              : "border-[var(--border-strong)] text-[var(--text-muted)]"
          }`}
        >
          {/* La pastille clignotante ne se justifie que pour un tournoi qui se
              joue en ce moment : sur « Terminé », elle mentirait. */}
          {t.status === "ONGOING" && <span className="live-dot" aria-hidden="true" />}
          {t.statusLabel}
        </span>
      </div>

      {/* Les étiquettes de tour vivent sur leur propre ligne, avec le même
          gabarit de colonnes : sinon la « Finale » descend au centre de sa
          colonne, plus courte, et les deux libellés ne s'alignent plus. */}
      <div className="grid grid-cols-[1fr_24px_1fr] gap-2">
        <Round label={t.semisLabel} />
        <span />
        <Round label={t.finalLabel} />
      </div>

      <div className="grid grid-cols-[1fr_24px_1fr] items-center gap-2">
        <div className="flex flex-col gap-3">
          {t.semis.map((b, i) => (
            <Bout key={i} bout={b} />
          ))}
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

        {t.final ? <Bout bout={t.final} /> : <span />}
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* 04 — Recrutement                                                    */
/* ------------------------------------------------------------------ */

const EXAMPLE_ADS: readonly ShowcaseAd[] = [
  {
    key: "a",
    tag: "SY",
    name: "sylk",
    logo: null,
    kind: "LFT",
    facts: ["Duelliste", "Immortal 2", "soirs de semaine"],
  },
  {
    key: "b",
    tag: "NRD",
    name: "Nordique",
    logo: null,
    kind: "LFP",
    facts: ["Cherche IGL", "Ascendant 3+", "3 soirs / semaine"],
  },
  {
    key: "c",
    tag: "KO",
    name: "koben",
    logo: null,
    kind: "LFT",
    facts: ["Coach", "2 saisons en division 2"],
  },
];

export function RecruitPanel({ data }: { data: readonly ShowcaseAd[] | null }) {
  const ads = data && data.length > 0 ? data : EXAMPLE_ADS;

  return (
    <Panel>
      <PanelHead
        label="Annonces"
        right={
          <span className="lf-t10 shrink-0 text-[var(--text-subtle)]">
            Filtrées par rôle, rang et région
          </span>
        }
      />
      <ul className="flex flex-col gap-2">
        {ads.map((a) => (
          <li
            key={a.key}
            className="flex items-center gap-3 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5"
          >
            <Tag tag={a.tag} logo={a.logo} size="h-9 w-9" />
            <div className="min-w-0 flex-1">
              <div className="lf-t13 truncate font-semibold text-white">{a.name}</div>
              <div className="lf-t10 mt-0.5 truncate text-[var(--text-muted)]">
                <Facts items={a.facts} />
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
