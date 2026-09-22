import Link from "next/link";
import "./landing-map.css";

/**
 * La carte tactique du hero : un plan vu de dessus, couché en perspective,
 * sur lequel se dressent des « pings » — un par grande section du site.
 *
 * Le tracé est inventé : il évoque une carte Valorant sans en recopier
 * aucune (les murs, les sites et les spawns sont à nous, pas à Riot). Il
 * est en coordonnées de `viewBox` 1200 × 700 ; les pings, eux, sont du HTML
 * placé en pourcentage du même repère, pour rester de vrais liens
 * focalisables au lieu d'éléments SVG que les lecteurs d'écran annoncent mal.
 */

/** Blocs de murs, en polylignes fermées. */
const BLOCKS: readonly string[] = [
  "M60 300 H230 V420 H60 Z",
  "M420 60 H520 V210 H470 V160 H420 Z",
  "M300 300 H470 V380 H400 V470 H300 Z",
  "M700 60 H800 V160 H760 V230 H700 Z",
  "M760 340 H900 V420 H820 V500 H760 Z",
  "M980 380 H1140 V470 H980 Z",
  "M180 520 H470 V560 H380 V640 H180 Z",
  "M700 560 H1000 V640 H700 Z",
  "M560 150 H640 V200 H560 Z",
];

/** Caisses posées sur les sites : ce qui fait lire « site » au premier coup d'œil. */
const BOXES: readonly { x: number; y: number; s: number }[] = [
  { x: 190, y: 160, s: 30 },
  { x: 262, y: 206, s: 22 },
  { x: 920, y: 196, s: 30 },
  { x: 1030, y: 262, s: 22 },
];

const OUTLINE =
  "M40 30 H1160 V360 H1180 V480 H1160 V680 H650 V700 H550 V680 H40 V480 H20 V300 H40 Z";

/**
 * La rotation d'attaque, du spawn jusqu'au site B où la spike est posée.
 * Ses pointillés avancent lentement vers le site : le seul mouvement continu
 * du plan, avec les ondes de la spike.
 */
const ROUTE = "M600 655 C600 560 585 470 600 400 S700 320 820 300 S930 250 985 238";

type Ping = {
  href: string;
  label: string;
  /** Nom de la zone sur la carte, en petit au-dessus du libellé. */
  zone: string;
  /** Position en pourcentage du repère 1200 × 700. */
  x: number;
  y: number;
  /** La spike : le ping mis en avant, là où ça se joue en ce moment. */
  hot?: boolean;
};

const PINGS: readonly Ping[] = [
  { href: "/tournois", label: "Tournois", zone: "Site A", x: 20.4, y: 27.1 },
  { href: "/matchs", label: "Matchs", zone: "Mid", x: 50, y: 55 },
  { href: "/premier", label: "Premier", zone: "Site B", x: 82.1, y: 34, hot: true },
  { href: "/joueurs", label: "Joueurs", zone: "Spawn att.", x: 50, y: 93.6 },
  { href: "/equipes", label: "Équipes", zone: "Spawn déf.", x: 50, y: 9 },
];

export default function LandingMap() {
  return (
    <div className="hm-stage">
      <div className="hm-plane">
        <svg className="hm-svg" viewBox="0 0 1200 700" aria-hidden="true">
          <path className="hm-outline" d={OUTLINE} />
          <rect className="hm-site" x="120" y="100" width="240" height="170" rx="10" />
          <rect className="hm-site" x="870" y="150" width="230" height="180" rx="10" />
          {BLOCKS.map((d) => (
            <path key={d} className="hm-block" d={d} />
          ))}
          {BOXES.map((b) => (
            <rect
              key={`${b.x}-${b.y}`}
              className="hm-box"
              x={b.x}
              y={b.y}
              width={b.s}
              height={b.s}
            />
          ))}
          <path className="hm-route" d={ROUTE} pathLength={1} />
          {/* La spike : un point fixe et deux ondes décalées, couchés dans le
              plan — la perspective en fait des ellipses, comme au sol. */}
          <circle className="hm-wave" cx="985" cy="238" r="46" />
          <circle className="hm-wave hm-wave-late" cx="985" cy="238" r="46" />
          <circle className="hm-spike" cx="985" cy="238" r="7" />
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
