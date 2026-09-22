import Link from "next/link";
import { ArrowRightIcon, CheckIcon } from "@/components/icons";
import "./landing-rounds.css";
import { RecruitPanel, ScoreboardPanel, TournamentPanel } from "@/components/landing-panels";
import { PlayerPanel } from "@/components/landing-panels-player";
import { ShareDiscord } from "@/components/landing-share-discord";
import { Tag } from "@/components/landing-panel-chrome";

type Feature = {
  /** Numéro du round, dans le HUD et sur le séparateur. */
  num: string;
  eyebrow: string;
  title: string;
  body: string;
  points: readonly { t: string; d: string }[];
  cta: { label: string; href: string };
  panel: () => React.ReactNode;
};

const FEATURES: readonly Feature[] = [
  {
    num: "01",
    eyebrow: "Scoreboard",
    title: "Chaque carte, chiffrée",
    body: "Le scoreboard de chaque carte est importé et vérifié, pas résumé en un score final. Treize colonnes par joueur, carte par carte, plus le cumulé sur la série.",
    points: [
      {
        t: "Rating, ACS, KAST, ADR",
        d: "Les indicateurs que vous regardez déjà, calculés round par round.",
      },
      {
        t: "Premiers duels comptés",
        d: "First kills, first deaths et leur différentiel, par joueur.",
      },
      {
        t: "Les agents sur la ligne",
        d: "Le portrait de l'agent joué, y compris quand il y a eu un changement.",
      },
    ],
    cta: { label: "Voir un match analysé", href: "/matchs" },
    panel: () => <ScoreboardPanel />,
  },
  {
    num: "02",
    eyebrow: "Fiche joueur",
    title: "Une carrière, pas juste un pseudo",
    body: "Chaque joueur a sa page : équipe actuelle, parcours daté, agents joués, winrate par carte et courbe de rating sur ses dernières parties.",
    points: [
      { t: "Trois chiffres clés en tête", d: "Agent le plus joué, K/D, meilleure partie." },
      {
        t: "Le détail par carte",
        d: "Winrate et nombre de parties, carte par carte, avec le repère à 50 %.",
      },
      {
        t: "Le parcours d'équipes",
        d: "Les passages successifs, avec leurs dates d'entrée et de sortie.",
      },
    ],
    cta: { label: "Parcourir les joueurs", href: "/joueurs" },
    panel: () => <PlayerPanel />,
  },
  {
    num: "03",
    eyebrow: "Tournois",
    title: "De l'inscription à la finale",
    body: "Inscrivez votre équipe, suivez les poules puis le bracket. Les statuts avancent tout seuls : à venir, en cours, terminé.",
    points: [
      {
        t: "Poules et élimination",
        d: "Simple, double élimination ou phase de groupes, au choix de l'organisateur.",
      },
      {
        t: "Classement tenu à jour",
        d: "Victoires, différentiel de cartes et de rounds, recalculés à chaque résultat.",
      },
      {
        t: "Une page publique par tournoi",
        d: "Format, dotation, équipes inscrites et calendrier, partageables tels quels.",
      },
    ],
    cta: { label: "Voir les tournois", href: "/tournois" },
    panel: () => <TournamentPanel />,
  },
  {
    num: "04",
    eyebrow: "Recrutement",
    title: "Trouver une équipe, ou un cinquième",
    body: "Les annonces de joueurs en recherche d'équipe et d'équipes en recherche de joueurs vivent au même endroit, filtrables par rôle, rang et région.",
    points: [
      { t: "LFT et LFP côte à côte", d: "Une seule page à surveiller pendant un mercato." },
      {
        t: "Coachs et managers inclus",
        d: "Le type de compte remplace le rôle Valorant quand il n'y en a pas.",
      },
      {
        t: "L'annonce mène à la fiche",
        d: "Stats, parcours et réseaux, avant même le premier message.",
      },
    ],
    cta: { label: "Voir les annonces", href: "/lft" },
    panel: () => <RecruitPanel />,
  },
  {
    num: "05",
    eyebrow: "Partage",
    title: "Un lien qui se présente tout seul",
    body: "Collez l'adresse d'un match dans Discord ou sur X : elle se déplie en un aperçu qui porte les deux équipes, le score et le détail des cartes. Rien à capturer, rien à recadrer.",
    points: [
      {
        t: "Fabriquée à la demande",
        d: "L'image est produite au moment où le lien est lu : elle porte les chiffres du jour.",
      },
      {
        t: "Un aperçu par page",
        d: "Match, joueur, équipe et tournoi ont chacun la leur.",
      },
      {
        t: "Une version carrée à télécharger",
        d: "Le format qu'attendent une story ou un post, depuis la fiche elle-même.",
      },
    ],
    cta: { label: "Voir un match à partager", href: "/matchs" },
    // Seule maquette sans données ni cadre commun : la scène est scriptée
    // dans sa propre fenêtre Discord (voir ShareDiscord).
    panel: () => <ShareDiscord />,
  },
];

/**
 * Les trois fonctionnalités secondaires, chacune avec un mini-exemple qui
 * montre le geste plutôt que de le décrire : une recherche en cours et ses
 * résultats mêlés, un roster avec une invitation en attente, une fiche aux
 * comptes reliés. Décoratifs (`aria-hidden`) : le texte au-dessus dit déjà
 * tout, la maquette ne fait que le montrer.
 */
function MiniSearch() {
  return (
    <div
      className="mt-3 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--bg)] p-2"
      aria-hidden="true"
    >
      <div className="flex items-center gap-2 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5">
        <svg viewBox="0 0 16 16" className="h-3 w-3 shrink-0 text-[var(--text-subtle)]">
          <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M11 11 L15 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <span className="lf-t11 text-white">s</span>
        <span className="h-3.5 w-px bg-[var(--accent)]" />
      </div>
      <ul className="mt-1.5 flex flex-col gap-1">
        <li className="flex items-center gap-2 px-1.5 py-1">
          <Tag tag="SN" logo="/landing/sneax.webp" size="h-5 w-5" />
          <span className="lf-t11 min-w-0 truncate text-white">SneaX</span>
          <span className="lf-t10 ml-auto shrink-0 uppercase tracking-[0.1em] text-[var(--text-subtle)]">
            Joueur
          </span>
        </li>
        <li className="flex items-center gap-2 px-1.5 py-1">
          <Tag tag="SA" logo="/landing/silentascencion.webp" size="h-5 w-5" />
          <span className="lf-t11 min-w-0 truncate text-white">SilentAscencion</span>
          <span className="lf-t10 ml-auto shrink-0 uppercase tracking-[0.1em] text-[var(--text-subtle)]">
            Équipe
          </span>
        </li>
      </ul>
    </div>
  );
}

function MiniRoster() {
  return (
    <div
      className="mt-3 flex flex-col gap-1.5 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--bg)] p-2"
      aria-hidden="true"
    >
      <div className="flex items-center gap-2 px-1.5 py-1">
        <Tag tag="SY" size="h-5 w-5" />
        <span className="lf-t11 min-w-0 truncate text-white">sylk</span>
        <span className="lf-t10 ml-auto shrink-0 rounded-full border border-[var(--border-strong)] px-1.5 py-px text-[var(--text-muted)]">
          Capitaine
        </span>
      </div>
      {/* L'invitation en attente : le pointillé dit « pas encore dans
          l'équipe », le badge dit qui doit répondre. */}
      <div className="flex items-center gap-2 rounded-[6px] border border-dashed border-[var(--border-strong)] px-1.5 py-1">
        <Tag tag="ME" size="h-5 w-5" />
        <span className="lf-t11 min-w-0 truncate text-[var(--text-muted)]">mevi</span>
        <span className="lf-t10 ml-auto shrink-0 rounded-full bg-[var(--accent-soft)] px-1.5 py-px font-semibold text-[var(--accent)] ring-1 ring-[var(--accent)]/40">
          Invitation envoyée
        </span>
      </div>
    </div>
  );
}

function MiniProfile() {
  return (
    <div
      className="mt-3 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--bg)] p-2"
      aria-hidden="true"
    >
      <div className="flex items-center gap-2 px-1.5 py-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/landing/lurrod.webp"
          alt=""
          loading="lazy"
          decoding="async"
          className="h-5 w-5 shrink-0 rounded-full object-cover"
        />
        <span className="lf-t11 min-w-0 truncate text-white">Lurrod</span>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5 px-1.5">
        {["Riot ID", "Discord", "Twitch"].map((c) => (
          <span
            key={c}
            className="lf-t10 inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 text-[var(--text-muted)]"
          >
            <span className="grid h-3 w-3 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
              <CheckIcon className="h-2 w-2" />
            </span>
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}

const ALSO = [
  {
    key: "C",
    t: "Recherche unifiée",
    d: "Joueurs, équipes et tournois dans un seul champ.",
    demo: <MiniSearch />,
  },
  {
    key: "Q",
    t: "Gestion de roster",
    d: "Invitations, départs et managers, sans passer par nous.",
    demo: <MiniRoster />,
  },
  {
    key: "E",
    t: "Profils reliés",
    d: "Riot ID, Discord, X et Twitch sur la fiche.",
    demo: <MiniProfile />,
  },
] as const;

/**
 * Deuxième partie de la landing : la démonstration, jouée comme une partie.
 *
 * Chaque fonctionnalité est un round. Un HUD collé sous la navigation rappelle
 * la barre de rounds du jeu : il sert de sommaire (chaque case est un lien
 * vers son round) et s'allume au défilement sur le round lu. L'allumage est
 * du CSS pur (`view-timeline`, voir `landing-rounds.css`) : sans prise en
 * charge, le HUD reste un simple sommaire, rien ne manque à la lecture.
 *
 * Remplace la mise en page en zigzag (texte / maquette alternés, liste à
 * coches) : c'était la grammaire de n'importe quelle page produit.
 *
 * Les maquettes sont entièrement scénarisées (voir `landing-panels.tsx` pour
 * le pourquoi) : la section ne lit pas la base, l'accueil s'affiche donc à
 * l'identique quel que soit l'état du site.
 */
export default function LandingShowcase() {
  return (
    <section aria-labelledby="fonctionnalites" className="lr-match">
      <div className="mx-auto w-full max-w-6xl px-4 pt-24 sm:pt-32">
        <div className="lf-reveal max-w-2xl">
          <span className="lf-eyebrow text-[var(--accent)]">Dans le Hub</span>
          <h2 id="fonctionnalites" className="lf-h2 mt-5 text-balance text-white">
            Tout ce qui manquait au Tier 3 français.
          </h2>
          <p className="lf-lede mt-5 max-w-[520px] text-pretty text-[var(--text-muted)]">
            Les scoreboards, les fiches et les tournois au même endroit — tenus à jour après chaque
            match, par les gens qui les jouent.
          </p>
        </div>
      </div>

      {/* Le HUD : collé sous la barre de navigation (47 px + sa bordure). */}
      <nav aria-label="Rounds de la démonstration" className="lr-hud">
        <ol className="lr-hud-row">
          {FEATURES.map((f, i) => (
            <li key={f.num}>
              <a href={`#round-${i + 1}`} className={`lr-cell lr-cell-${i + 1}`}>
                <span className="lr-cell-n stat">{f.num}</span>
                <span className="lr-cell-t">{f.eyebrow}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mx-auto w-full max-w-6xl px-4 pb-24 sm:pb-32">
        {FEATURES.map((f, i) => (
          <article
            key={f.num}
            id={`round-${i + 1}`}
            aria-labelledby={`round-${i + 1}-titre`}
            className={`lr-round lr-round-${i + 1}`}
          >
            {/* Le séparateur de round : numéro, filet, nom de la phase. */}
            <div className="lf-reveal lr-divider" aria-hidden="true">
              <span className="lr-divider-n stat">Round {f.num}</span>
              <span className="lr-divider-line" />
              <span className="lr-divider-t">{f.eyebrow}</span>
            </div>

            <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
              {/* Le texte reste en place pendant qu'on lit la maquette. */}
              <div className="lf-reveal min-w-0 lg:sticky lg:top-[132px] lg:col-span-4 lg:self-start">
                <h3 id={`round-${i + 1}-titre`} className="lf-h3 text-balance text-white">
                  {f.title}
                </h3>
                <p className="lf-body mt-5 text-pretty text-[var(--text-muted)]">{f.body}</p>
                <Link
                  href={f.cta.href}
                  className="lf-act group mt-8 inline-flex items-center gap-2 font-semibold text-white underline-offset-4 transition-colors hover:text-[var(--accent)]"
                >
                  {f.cta.label}
                  <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>

              <div className="lf-reveal min-w-0 lg:col-span-8">
                {f.panel()}
                {/* Les points en bande sous la maquette, numérotés comme des
                    sous-rounds : plus de liste à coches, qui faisait fiche
                    produit. */}
                <ul className="mt-8 grid gap-6 sm:grid-cols-3 sm:gap-5">
                  {f.points.map((p, k) => (
                    <li key={p.t} className="lr-point">
                      <span className="lr-point-n stat" aria-hidden="true">
                        {i + 1}.{k + 1}
                      </span>
                      <span className="lf-point-t mt-2 block font-semibold text-white">{p.t}</span>
                      <span className="lf-point-d mt-1 block text-[var(--text-muted)]">{p.d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </article>
        ))}

        {/* Le reste, en utilitaires : les trois touches de capacité du jeu. */}
        <div className="lf-reveal mt-28 sm:mt-40">
          <div className="lr-divider" aria-hidden="true">
            <span className="lr-divider-n stat">Utilitaires</span>
            <span className="lr-divider-line" />
          </div>
          <h3 className="sr-only">Aussi dans le Hub</h3>
          <ul className="grid gap-3 sm:grid-cols-3">
            {ALSO.map((a) => (
              <li key={a.t} className="card flex flex-col p-4">
                <div className="flex items-center gap-3">
                  <span className="lr-key stat" aria-hidden="true">
                    {a.key}
                  </span>
                  <div className="lf-point-t font-semibold text-white">{a.t}</div>
                </div>
                <p className="lf-point-d mt-3 text-[var(--text-muted)]">{a.d}</p>
                {/* Le mini-exemple est calé en bas de carte : les trois demos
                    s'alignent d'une colonne à l'autre quel que soit le texte. */}
                <div className="mt-auto">{a.demo}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
