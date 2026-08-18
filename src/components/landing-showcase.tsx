import Link from "next/link";
import { ArrowRightIcon, CheckIcon } from "@/components/icons";
import { RecruitPanel, ScoreboardPanel, TournamentPanel } from "@/components/landing-panels";
import { PlayerPanel } from "@/components/landing-panels-player";
import { ShareDiscord } from "@/components/landing-share-discord";
import { Tag } from "@/components/landing-panel-chrome";
import LandingFlow from "@/components/landing-flow";

type Feature = {
  /** Numéro affiché en filigrane derrière le titre. */
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
    body: "Chaque joueur a sa page : équipe actuelle, parcours daté, agents joués, winrate par map et courbe de rating sur ses dernières cartes.",
    points: [
      { t: "Trois chiffres clés en tête", d: "Agent le plus joué, K/D, meilleure partie." },
      {
        t: "Le détail par map",
        d: "Winrate et nombre de cartes, map par map, avec le repère à 50 %.",
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
    body: "Collez l'adresse d'un match dans Discord ou sur X : elle se déplie en une carte qui porte les deux équipes, le score et le détail des cartes. Rien à capturer, rien à recadrer.",
    points: [
      {
        t: "Fabriquée à la demande",
        d: "L'image est produite au moment où le lien est lu : elle porte les chiffres du jour.",
      },
      {
        t: "Une carte par page",
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
    t: "Recherche unifiée",
    d: "Joueurs, équipes et tournois dans un seul champ.",
    demo: <MiniSearch />,
  },
  {
    t: "Gestion de roster",
    d: "Invitations, départs et managers, sans passer par nous.",
    demo: <MiniRoster />,
  },
  {
    t: "Profils reliés",
    d: "Riot ID, Discord, X et Twitch sur la fiche.",
    demo: <MiniProfile />,
  },
] as const;

/**
 * Deuxième partie de la landing : la démonstration des fonctionnalités.
 *
 * Un bloc par fonctionnalité, texte et maquette alternés d'un bloc à l'autre.
 * L'apparition au défilement est purement CSS (`.lf-reveal`) : rien ici ne
 * dépend du JavaScript pour être lisible.
 *
 * Les maquettes sont entièrement scénarisées (voir `landing-panels.tsx` pour
 * le pourquoi) : la section ne lit pas la base, l'accueil s'affiche donc à
 * l'identique quel que soit l'état du site.
 */
export default function LandingShowcase() {
  return (
    <section
      aria-labelledby="fonctionnalites"
      className="mx-auto w-full max-w-6xl px-4 py-24 sm:py-32"
    >
      {/* En-tête de section */}
      <div className="lf-reveal mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
        <div className="lf-rule w-full max-w-[220px]" aria-hidden="true" />
        <span className="lf-eyebrow text-[var(--accent)]">Dans le Hub</span>
        <h2 id="fonctionnalites" className="lf-h2 text-balance text-white">
          Tout ce qui manquait au Tier 3 français.
        </h2>
        <p className="lf-lede max-w-[520px] text-pretty text-[var(--text-muted)]">
          Les scoreboards, les fiches et les tournois au même endroit — tenus à jour après chaque
          match, par les gens qui les jouent.
        </p>
      </div>

      {/* Blocs de fonctionnalités */}
      <div className="relative mt-24 flex flex-col gap-28 sm:mt-32 sm:gap-40">
        {/* Le fil lumineux qui relie les maquettes, peint sous les blocs. */}
        <LandingFlow />
        {FEATURES.map((f, i) => {
          // Une ligne sur deux inverse texte et maquette. `order` ne s'applique
          // qu'à partir de `lg` : en une seule colonne, la maquette suit
          // toujours son texte, sinon la lecture au clavier part en zigzag.
          const flipped = i % 2 === 1;
          return (
            <div
              key={f.num}
              className="lf-reveal grid items-center gap-10 lg:grid-cols-2 lg:gap-20"
            >
              <div className={`relative min-w-0 ${flipped ? "lg:order-2" : ""}`}>
                <span
                  aria-hidden="true"
                  className="lf-num pointer-events-none absolute -left-[0.05em] -top-[0.72em] hidden select-none lg:block"
                >
                  {f.num}
                </span>

                <div className="relative lg:max-w-[480px]">
                  <span className="lf-eyebrow text-[var(--accent)]">{f.eyebrow}</span>
                  <h3 className="lf-h3 mt-4 text-balance text-white">{f.title}</h3>
                  <p className="lf-body mt-5 text-pretty text-[var(--text-muted)]">{f.body}</p>

                  <ul className="mt-8 flex flex-col gap-5">
                    {f.points.map((p) => (
                      <li key={p.t} className="flex items-start gap-3">
                        <span className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)] ring-1 ring-[var(--accent)]/25">
                          <CheckIcon />
                        </span>
                        <span className="min-w-0">
                          <span className="lf-point-t block font-semibold text-white">{p.t}</span>
                          <span className="lf-point-d mt-1 block text-[var(--text-muted)]">
                            {p.d}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={f.cta.href}
                    className="lf-act group mt-9 inline-flex items-center gap-2 font-semibold text-white underline-offset-4 transition-colors hover:text-[var(--accent)]"
                  >
                    {f.cta.label}
                    <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>

              <div className={`min-w-0 ${flipped ? "lg:order-1" : ""}`}>{f.panel()}</div>
            </div>
          );
        })}
      </div>

      {/* Le reste, sans y consacrer un bloc entier */}
      <div className="lf-reveal mt-28 sm:mt-40">
        <div className="flex items-center gap-4">
          <span className="lf-eyebrow shrink-0 text-[var(--text-subtle)]">Aussi dans le Hub</span>
          <div className="lf-rule min-w-0 flex-1" aria-hidden="true" />
        </div>
        <ul className="mt-8 grid gap-3 sm:grid-cols-3">
          {ALSO.map((a) => (
            <li key={a.t} className="card flex flex-col p-4">
              <div className="lf-point-t font-semibold text-white">{a.t}</div>
              <p className="lf-point-d mt-1.5 text-[var(--text-muted)]">{a.d}</p>
              {/* Le mini-exemple est calé en bas de carte : les trois demos
                  s'alignent d'une colonne à l'autre quel que soit le texte. */}
              <div className="mt-auto">{a.demo}</div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
