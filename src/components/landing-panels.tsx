import AgentIcon from "@/components/agent-icon";
import type { TournamentStatus } from "@/lib/constants";

/**
 * Maquettes de la landing : chaque bloc de fonctionnalité est illustré par un
 * fragment de l'interface réelle, rejoué en HTML plutôt que capturé en image.
 *
 * Pourquoi pas des captures d'écran : une maquette en HTML reste nette à tous
 * les zooms, suit la charte quand un jeton change, se traduit, et ne demande
 * aucun asset à régénérer à chaque évolution de l'interface.
 *
 * La vitrine est entièrement scénarisée, plus branchée sur la base. Elle l'a
 * été : en production, chaque panneau affichait alors le dernier contenu
 * importé, n'importe lequel — la vitrine changeait de visage à chaque import
 * et les exemples choisis ne se montraient jamais. Une vitrine raconte un
 * exemple précis ; les vraies données, elles, sont à un clic derrière chaque
 * bouton « Voir ».
 *
 * Le scoreboard et le tournoi rejouent un vrai résultat — la finale des
 * Playoff Premier Invite V26A4 (Lyost 2-0 PuR Esport), chiffres relevés sur
 * la fiche du match : un exemple crédible vaut mieux qu'un inventé. Fiche
 * joueur et annonces restent inventées : ce sont des données personnelles
 * (carrière, recherche d'équipe), on ne prête pas de chiffres ni d'intentions
 * à de vraies personnes.
 *
 * La maquette « Partage », elle, vit dans `landing-share-discord.tsx` : c'est
 * une conversation Discord scénarisée, hors du cadre commun, sur ce même
 * match.
 */

/** Équipe telle qu'affichée dans un aperçu : logo si elle en a un, sinon monogramme. */
export type ShowcaseTeam = {
  tag: string;
  name: string;
  logo: string | null;
};

type ShowcaseScoreboardLine = {
  pseudo: string;
  agent: string | null;
  rating: number;
  acs: number;
  kills: number;
  deaths: number;
  assists: number;
  kast: number;
  adr: number;
};

type ShowcaseScoreboard = {
  teamA: ShowcaseTeam;
  teamB: ShowcaseTeam;
  mapName: string;
  /** Rang de la carte dans la série et longueur de la série, pour « carte 2 sur 3 ». */
  mapIndex: number;
  mapCount: number;
  roundsA: number;
  roundsB: number;
  lines: ShowcaseScoreboardLine[];
};

type ShowcaseBout = {
  top: ShowcaseTeam & { score: number };
  bottom: ShowcaseTeam & { score: number };
};

type ShowcaseTournament = {
  name: string;
  logo: string | null;
  format: string;
  status: TournamentStatus;
  statusLabel: string;
  teamCount: number;
  prizePool: string | null;
  /** Deux confrontations d'un même tour, puis celle du tour suivant. */
  semis: ShowcaseBout[];
  final: ShowcaseBout | null;
  /** Libellés des deux tours, tels que l'organisateur les a nommés. */
  semisLabel: string;
  finalLabel: string;
};

type ShowcaseAd = {
  key: string;
  name: string;
  tag: string;
  logo: string | null;
  kind: "LFT" | "LFP";
  facts: string[];
};

/** Coquille commune : cadre, nappe d'accent, trame de points (cf. `.lf-panel`). */
import { Facts, Panel, PanelHead, Tag, initials } from "@/components/landing-panel-chrome";

/* ------------------------------------------------------------------ */
/* 01 — Scoreboard                                                     */
/* ------------------------------------------------------------------ */

/**
 * L'Ascent de la finale des Premier Invite, côté Lyost : chiffres relevés sur
 * la fiche du match (`/matchs/cmsutba5a005qhixwr3li5j1q`). Le 28/11 à 1.92 de
 * Paingu montre mieux ce qu'est un scoreboard qu'une ligne moyenne inventée.
 */
const EXAMPLE_SCOREBOARD: ShowcaseScoreboard = {
  teamA: { tag: "LYO", name: "Lyost", logo: "/landing/lyost.webp" },
  teamB: { tag: "PuR", name: "PuR Esport", logo: "/landing/pur.webp" },
  mapName: "Ascent",
  mapIndex: 2,
  mapCount: 2,
  roundsA: 13,
  roundsB: 7,
  lines: [
    {
      pseudo: "Paingu",
      agent: "Jett",
      rating: 1.92,
      acs: 363,
      kills: 28,
      deaths: 11,
      assists: 4,
      kast: 80,
      adr: 231,
    },
    {
      pseudo: "Zoom",
      agent: "Omen",
      rating: 1.72,
      acs: 297,
      kills: 24,
      deaths: 12,
      assists: 8,
      kast: 90,
      adr: 176,
    },
    {
      pseudo: "3phones",
      agent: "Sova",
      rating: 1.07,
      acs: 194,
      kills: 13,
      deaths: 11,
      assists: 4,
      kast: 75,
      adr: 137,
    },
    {
      pseudo: "SkeeneX",
      agent: "Phoenix",
      rating: 0.86,
      acs: 145,
      kills: 10,
      deaths: 12,
      assists: 5,
      kast: 75,
      adr: 99,
    },
    {
      pseudo: "whitecatwww Fan",
      agent: "Cypher",
      rating: 0.69,
      acs: 161,
      kills: 10,
      deaths: 16,
      assists: 4,
      kast: 65,
      adr: 109,
    },
  ],
};

/**
 * Colonnes chiffrées, en-tête et cellule décrites au même endroit pour qu'elles
 * ne puissent pas se désynchroniser.
 *
 * K, D et A sont réunis en une colonne « KDA » : trois colonnes d'un chiffre
 * se lisaient comme trois statistiques sans lien, la forme 28 / 11 / 4 est
 * celle que tout joueur connaît — et la place gagnée garde le tableau dans
 * 390 px sans défilement latéral. `narrow: false` retire la colonne la moins
 * parlante hors contexte sous `sm`.
 */
const COLS: readonly {
  key: string;
  cell: (l: ShowcaseScoreboard["lines"][number]) => string;
  narrow: boolean;
  strong?: boolean;
}[] = [
  { key: "R", cell: (l) => l.rating.toFixed(2), narrow: true, strong: true },
  { key: "ACS", cell: (l) => String(l.acs), narrow: true },
  { key: "KDA", cell: (l) => `${l.kills} / ${l.deaths} / ${l.assists}`, narrow: true },
  { key: "KAST", cell: (l) => `${l.kast}%`, narrow: false },
  { key: "ADR", cell: (l) => String(l.adr), narrow: true },
];

export function ScoreboardPanel() {
  const s = EXAMPLE_SCOREBOARD;
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
        <div className="stat lf-t18 lf-hov-pop flex shrink-0 items-center gap-2 font-semibold">
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
          {s.lines.map((l, i) => (
            <tr
              key={l.pseudo}
              className="lf-hov-row border-b border-[var(--border)] last:border-0"
              style={{ animationDelay: `${i * 55}ms` }}
            >
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
/* 03 — Tournoi                                                        */
/* ------------------------------------------------------------------ */

/**
 * Le bracket final des Playoff Premier Invite V26A4, tel que sa page le
 * donne : demi-finales en Bo1 (scores en rounds), finale en Bo3 (score en
 * cartes). Même tournoi que le scoreboard et la scène de partage — la
 * vitrine raconte une seule soirée, réelle.
 */
const EXAMPLE_TOURNAMENT: ShowcaseTournament = {
  name: "Playoff Premier Invite V26A4",
  logo: "/landing/premier-invite.webp",
  format: "Simple élimination",
  status: "FINISHED",
  statusLabel: "Terminé",
  teamCount: 8,
  prizePool: null,
  semisLabel: "Demi-finales",
  finalLabel: "Finale",
  semis: [
    {
      top: { tag: "LYO", name: "Lyost", logo: "/landing/lyost.webp", score: 13 },
      bottom: {
        tag: "SA",
        name: "SilentAscencion",
        logo: "/landing/silentascencion.webp",
        score: 9,
      },
    },
    {
      top: { tag: "HLT", name: "HL Tauri eSports", logo: "/landing/hltauri.webp", score: 6 },
      bottom: { tag: "PuR", name: "PuR Esport", logo: "/landing/pur.webp", score: 13 },
    },
  ],
  final: {
    top: { tag: "LYO", name: "Lyost", logo: "/landing/lyost.webp", score: 2 },
    bottom: { tag: "PuR", name: "PuR Esport", logo: "/landing/pur.webp", score: 0 },
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
                won ? "lf-hov-pop text-[var(--accent)]" : "text-[var(--text-subtle)]"
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

export function TournamentPanel() {
  const t = EXAMPLE_TOURNAMENT;
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
            <div key={i} className="lf-hov-row" style={{ animationDelay: `${i * 90}ms` }}>
              <Bout bout={b} />
            </div>
          ))}
        </div>

        {/* Embranchements vers la finale. Le tracé est en pourcentages de la
            hauteur de la colonne : deux confrontations de même gabarit ont
            leurs centres à 22,5 % et 77,5 %, quelle que soit la hauteur réelle
            des lignes. `preserveAspectRatio="none"` étire donc juste. */}
        <svg
          viewBox="0 0 24 100"
          preserveAspectRatio="none"
          className="lf-hov-wipe h-full w-6 self-stretch text-[var(--border-strong)]"
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
    facts: ["Coach", "2 saisons en Premier Invite"],
  },
];

export function RecruitPanel() {
  const ads = EXAMPLE_ADS;

  return (
    <Panel>
      <PanelHead
        label="Annonces"
        right={
          <span className="lf-t10 shrink-0 text-[var(--text-subtle)]">
            {ads.length} annonce{ads.length > 1 ? "s" : ""}
          </span>
        }
      />
      {/* La barre de filtres de la vraie page, en décor : elle montre le
          geste (filtrer par rôle, rang, région) sans prétendre qu'un filtre
          est actif — les annonces affichées sont les vraies, non filtrées. */}
      <div className="flex flex-wrap items-center gap-1.5" aria-hidden="true">
        {["Rôle", "Rang", "Région"].map((f) => (
          <span
            key={f}
            className="lf-t10 inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1 font-medium text-[var(--text-muted)]"
          >
            {f}
            <svg viewBox="0 0 8 5" className="h-1 w-2 text-[var(--text-subtle)]" aria-hidden="true">
              <path d="M0 0 L4 5 L8 0" fill="currentColor" />
            </svg>
          </span>
        ))}
        <span className="lf-t10 inline-flex items-center rounded-full border border-[var(--accent)]/50 bg-[var(--accent-soft)] px-2.5 py-1 font-semibold text-[var(--accent)]">
          LFT + LFP
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {ads.map((a, i) => (
          <li
            key={a.key}
            className="lf-hov-row flex items-center gap-3 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5"
            style={{ animationDelay: `${i * 80}ms` }}
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
                  ? "lf-hov-pop border-[var(--accent)] text-[var(--accent)]"
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
