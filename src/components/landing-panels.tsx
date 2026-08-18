import AgentIcon from "@/components/agent-icon";
import type {
  ShowcaseAd,
  ShowcaseBout,
  ShowcaseMatchCard,
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
import { Facts, Panel, PanelHead, Tag, initials } from "@/components/landing-panel-chrome";

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
  // Le meilleur rating de la carte porte l'étiquette MVP, comme sur la vraie
  // fiche match : c'est la ligne que l'œil doit trouver en premier.
  const mvp = s.lines.reduce((best, l, i) => (l.rating > s.lines[best].rating ? i : best), 0);

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
                  {i === mvp && (
                    <span className="lf-t10 lf-hov-pop shrink-0 rounded-full bg-[var(--accent-soft)] px-1.5 py-px font-semibold tracking-[0.1em] text-[var(--accent)] ring-1 ring-[var(--accent)]/40">
                      MVP
                    </span>
                  )}
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

export function TournamentPanel({ data }: { data: ShowcaseTournament | null }) {
  const t = data ?? EXAMPLE_TOURNAMENT;
  const facts = [
    t.format,
    `${t.teamCount} équipe${t.teamCount > 1 ? "s" : ""}`,
    t.prizePool,
  ].filter((f): f is string => !!f);
  // Le vainqueur de la finale n'existe que si elle est jouée et départagée :
  // une égalité est un match en cours de saisie, pas un champion.
  const champion =
    t.final && t.final.top.score !== t.final.bottom.score
      ? t.final.top.score > t.final.bottom.score
        ? t.final.top
        : t.final.bottom
      : null;

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
          className="h-full w-6 self-stretch text-[var(--border-strong)]"
          aria-hidden="true"
        >
          <path
            className="lf-hov-draw"
            pathLength={1}
            d="M0 22.5 H12 V50 H24 M0 77.5 H12 V50"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {t.final ? (
          <div className="flex flex-col gap-2">
            <Bout bout={t.final} />
            {champion && (
              <div className="lf-hov-pop flex items-center justify-center gap-1.5 rounded-[var(--r-md)] bg-[var(--accent-soft)] px-2 py-1.5 ring-1 ring-[var(--accent)]/30">
                <span className="lf-t10 truncate font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
                  Champion · {champion.name}
                </span>
              </div>
            )}
          </div>
        ) : (
          <span />
        )}
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

/* ------------------------------------------------------------------ */
/* 05 — Carte de partage                                               */
/* ------------------------------------------------------------------ */

const EXAMPLE_MATCH_CARD: ShowcaseMatchCard = {
  id: "cm7x2k9d40001",
  badge: "MATCH · TERMINÉ",
  teamA: { tag: "VRM", name: "Vermeil", logo: null },
  teamB: { tag: "NRD", name: "Nordique", logo: null },
  center: "2 – 1",
  meta: "Hub Open #3 · Demi-finales · Bo3",
  maps: "Ascent 13-9 · Haven 11-13 · Lotus 13-7",
};

/** Un camp du duel : logo au-dessus, nom en dessous, sur une colonne égale. */
function Side({ team }: { team: ShowcaseTeam }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
      <Tag tag={team.tag} logo={team.logo} size="h-10 w-10" />
      <span className="lf-t11 w-full truncate text-center font-semibold text-white">
        {team.name}
      </span>
    </div>
  );
}

/**
 * Rejoue la carte de partage d'un match : bandeau de marque et badge en haut,
 * le duel au centre, tournoi et cartes en dessous, domaine en pied.
 *
 * La composition et les rôles de couleur viennent de `matchs/[id]/
 * opengraph-image` et de `lib/og/fields`. Les quatre lignes de texte, elles,
 * sont composées en amont par `getShowcaseMatchCard` avec les helpers de
 * `lib/og/labels` : la maquette ne réécrit aucun libellé, elle affiche mot
 * pour mot ce que dirait l'image.
 *
 * Ce n'est volontairement pas l'image elle-même : l'afficher demanderait un
 * rendu Satori par visiteur sur la page la plus servie du site, pour un
 * résultat identique à l'œil.
 *
 * Elle est montrée là où on la voit vraiment, dans un message : c'est ce qui
 * la distingue d'une simple illustration de fiche.
 */
export function SharePanel({ data }: { data: ShowcaseMatchCard | null }) {
  const m = data ?? EXAMPLE_MATCH_CARD;

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
            the-hub-vrc.fr/matchs/{m.id}
          </p>

          {/* L'aperçu déplié, liseré d'accent à gauche comme dans un client de
              discussion. */}
          <div className="lf-hov-lift mt-2 overflow-hidden rounded-[var(--r-md)] border border-l-2 border-[var(--border)] border-l-[var(--accent)] bg-[var(--bg)]">
            {/* La proportion réelle de la carte (1200×630) n'est tenue qu'à
                partir de `sm` : sous 400 px de large, elle réduirait la hauteur
                au point d'écraser le contenu. En dessous, la carte prend la
                hauteur qu'il lui faut. */}
            <div className="flex min-w-0 flex-col justify-between gap-3 p-3.5 sm:aspect-[1200/630]">
              <div className="flex items-center gap-2">
                {/* Rendu à 20 px : le PNG source de 1125 px (98 Ko) était
                    téléchargé sur l'accueil pour cette seule vignette. Le webp
                    fait 3,7 Ko, comme dans la barre de navigation. Le PNG reste
                    nécessaire, mais côté serveur seulement, pour les images de
                    partage (src/lib/og/frame.tsx). */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.webp"
                  width={130}
                  height={128}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-5 w-5 shrink-0 rounded-[4px] object-cover"
                />
                <span className="stat lf-t10 truncate tracking-[0.22em] text-[var(--accent)]">
                  {m.badge}
                </span>
              </div>

              <div className="flex min-w-0 flex-col gap-2">
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <Side team={m.teamA} />
                  <span className="lf-og-title lf-hov-pop shrink-0 text-[var(--accent)]">
                    {m.center}
                  </span>
                  <Side team={m.teamB} />
                </div>
                {m.meta && (
                  <span className="stat lf-t10 truncate text-[var(--text-muted)]">{m.meta}</span>
                )}
                {m.maps && (
                  <span className="stat lf-t10 truncate text-[var(--accent)]">{m.maps}</span>
                )}
              </div>

              <span className="stat lf-t10 text-[var(--accent)]">the-hub-vrc.fr</span>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}
