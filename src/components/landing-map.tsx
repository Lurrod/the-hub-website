import Link from "next/link";
import "./landing-map.css";

/**
 * La carte tactique du hero : la minimap d'Ascent, couchée en perspective,
 * sur laquelle se dressent des « pings » — un par grande section du site.
 *
 * Une première version dessinait une carte inventée : des blocs gris qu'aucun
 * joueur ne reconnaissait. C'est désormais la vraie minimap, la même famille
 * d'assets officiels que les splashs de maps du site (valorant-api.com),
 * figée dans `public/landing/ascent-minimap.webp` (1024 px, webp) comme les
 * autres images de la landing — aucune requête vers un domaine tiers, la CSP
 * n'a rien à déclarer.
 *
 * Toutes les positions sont en pourcentage de la minimap et viennent des
 * callouts de l'API, convertis par les coefficients de la map
 * (u = y·xMultiplier + xScalarToAdd, v = x·yMultiplier + yScalarToAdd) :
 * chaque ping est posé sur le vrai callout dont il porte le nom.
 */

type Pt = { x: number; y: number };

const CALLOUTS = {
  aSite: { x: 35, y: 14.2 },
  bSite: { x: 28.5, y: 73.7 },
  bMain: { x: 40.5, y: 71.2 },
  bLobby: { x: 71.7, y: 67.8 },
  courtyard: { x: 49.3, y: 48.8 },
  attackerSpawn: { x: 81.7, y: 56.9 },
  defenderSpawn: { x: 13.2, y: 43.4 },
} as const satisfies Record<string, Pt>;

/** Noms de callouts posés à plat sur la carte, comme sur la minimap du jeu. */
const LABELS: readonly (Pt & { t: string })[] = [
  { t: "A Main", x: 48.4, y: 20.1 },
  { t: "Tree", x: 39.8, y: 29.5 },
  { t: "Garden", x: 28.5, y: 30.9 },
  { t: "Wine", x: 48.6, y: 5.8 },
  { t: "Catwalk", x: 52.5, y: 41.1 },
  { t: "Market", x: 29.8, y: 49.7 },
  { t: "Pizza", x: 30.6, y: 44.7 },
  { t: "Top Mid", x: 66.5, y: 38 },
  { t: "Link", x: 51.4, y: 61.7 },
  { t: "B Main", x: 40.5, y: 71.2 },
  { t: "Boat House", x: 27, y: 88.7 },
];

/**
 * La rotation d'attaque, du spawn jusqu'au site B par B Lobby et B Main — un
 * vrai chemin de la carte. Ses pointillés avancent lentement vers le site.
 */
const { attackerSpawn: s, bLobby: l, bMain: m, bSite: b } = CALLOUTS;
const ROUTE = `M${s.x} ${s.y} C${s.x - 2} ${s.y + 9} ${l.x + 4} ${l.y} ${l.x} ${l.y} S${m.x + 8} ${m.y} ${m.x} ${m.y} S${b.x + 4} ${b.y} ${b.x} ${b.y}`;

type Ping = Pt & {
  href: string;
  label: string;
  /** Nom de la zone sur la carte, en petit au-dessus du libellé. */
  zone: string;
  /** La spike : le ping mis en avant, là où ça se joue en ce moment. */
  hot?: boolean;
};

const PINGS: readonly Ping[] = [
  { href: "/tournois", label: "Tournois", zone: "Site A", ...CALLOUTS.aSite },
  { href: "/matchs", label: "Matchs", zone: "Mid", ...CALLOUTS.courtyard },
  { href: "/premier", label: "Premier", zone: "Site B", hot: true, ...CALLOUTS.bSite },
  { href: "/joueurs", label: "Joueurs", zone: "Spawn att.", ...CALLOUTS.attackerSpawn },
  { href: "/equipes", label: "Équipes", zone: "Spawn déf.", ...CALLOUTS.defenderSpawn },
];

export default function LandingMap() {
  return (
    <div className="hm-stage">
      <div className="hm-plane">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/landing/ascent-minimap.webp"
          alt=""
          width={1024}
          height={1024}
          decoding="async"
          fetchPriority="high"
          className="hm-floor"
        />
        <svg className="hm-svg" viewBox="0 0 100 100" aria-hidden="true">
          {/* Les lettres des sites, à plat, comme sur la minimap du jeu. */}
          <text className="hm-letter" x={CALLOUTS.aSite.x} y={CALLOUTS.aSite.y + 6}>
            A
          </text>
          <text className="hm-letter" x={CALLOUTS.bSite.x - 1} y={CALLOUTS.bSite.y + 8}>
            B
          </text>
          {LABELS.map((c) => (
            <text key={c.t} className="hm-callout" x={c.x} y={c.y}>
              {c.t}
            </text>
          ))}
          <path className="hm-route" d={ROUTE} pathLength={1} />
          {/* La spike : un point fixe et deux ondes décalées, couchés dans le
              plan — la perspective en fait des ellipses, comme au sol. */}
          <circle className="hm-wave" cx={b.x} cy={b.y} r="4.5" />
          <circle className="hm-wave hm-wave-late" cx={b.x} cy={b.y} r="4.5" />
          <circle className="hm-spike" cx={b.x} cy={b.y} r="0.8" />
        </svg>

        <nav aria-label="Sections du Hub" className="hm-pings">
          {PINGS.map((p) => (
            <div
              key={p.href}
              className="hm-pin"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
              data-hot={p.hot ? "" : undefined}
            >
              {/* Le ping se redresse face à l'écran : sans ça, les libellés
                  seraient couchés avec la carte et illisibles. */}
              <div className="hm-up">
                <Link href={p.href} className="hm-tag">
                  <span className="hm-zone">{p.zone}</span>
                  <span className="hm-label">{p.label}</span>
                </Link>
                <span className="hm-stem" aria-hidden="true" />
              </div>
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}
