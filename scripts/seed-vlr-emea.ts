/**
 * Seed de démonstration : importe « VCT 2026: EMEA Stage 1 » (données publiques
 * vlr.gg) - 8 équipes avec logos + rosters, 2 poules, classements, et un bracket
 * de playoffs. Idempotent : supprime puis recrée les entrées préfixées « vlr- ».
 *
 * Profils joueurs : pseudo, nationalité et photo viennent de vlr.gg (les photos
 * restent hébergées chez eux, rien n'est copié dans le dépôt). Le rôle Valorant,
 * la date de naissance et la date d'arrivée sont des valeurs plausibles de
 * démonstration, pas des données importées.
 *
 * Réseaux des équipes : uniquement ceux listés par vlr.gg (site officiel et X,
 * parfois Instagram). Pour voir le bandeau avec les six réseaux, utiliser
 * l'équipe fictive « Alpha Esports » du seed de dev.
 *
 * Lancer :  npx tsx scripts/seed-vlr-emea.ts
 */
import { PrismaClient, type MatchStage, type MatchStatus, type ValorantRole } from "@prisma/client";

const db = new PrismaClient();

const TID = "vlr-emea-s1";
const img = (h: string) => `https://owcdn.net/img/${h}.png`;

type PersonSeed = {
  pseudo: string;
  /** Nom de pays en français (voir src/lib/countries.ts), null si inconnu. */
  country: string | null;
  /** Hash de l'image vlr.gg, null si le joueur n'a pas de photo là-bas. */
  photo: string | null;
  role: ValorantRole | null;
  born: string | null;
  joined: string;
};

type TeamSeed = {
  id: string;
  name: string;
  tag: string;
  logo: string;
  /** Liens officiels tels que listés sur vlr.gg (site + X, parfois Instagram). */
  socials: Record<string, string>;
  group: "alpha" | "omega";
  seed: number;
  players: PersonSeed[];
  coach: PersonSeed;
};

const TR = "Turquie";
const RU = "Russie";
const PL = "Pologne";
const UK = "Royaume-Uni";
const CZ = "République tchèque";
const LT = "Lituanie";

const TEAMS: TeamSeed[] = [
  {
    id: "vlr-fut", name: "FUT Esports", tag: "FUT", logo: img("632be9976b8fe"),
    socials: { website: "https://futesports.gg/", twitter: "https://x.com/FUTesportsgg" },
    group: "alpha", seed: 1,
    players: [
      { pseudo: "sociablEE", country: TR, photo: "680a926893d7b", role: "INITIATOR", born: "2002-02-11", joined: "2025-11-06" },
      { pseudo: "s0pp", country: TR, photo: null, role: "DUELIST", born: "2005-08-23", joined: "2026-01-12" },
      { pseudo: "xeus", country: TR, photo: "697ab97a4855f", role: "SENTINEL", born: "2001-06-30", joined: "2024-10-18" },
      { pseudo: "yetujey", country: TR, photo: "697ab948ca75e", role: "CONTROLLER", born: "2000-03-04", joined: "2023-11-22" },
      { pseudo: "KROSTALY", country: TR, photo: "697aba0af3cd9", role: "INITIATOR", born: "2004-09-17", joined: "2025-06-09" },
    ],
    coach: { pseudo: "Vlad", country: TR, photo: "68730dca15978", role: null, born: "1996-05-02", joined: "2023-12-01" },
  },
  {
    id: "vlr-tl", name: "Team Liquid", tag: "TL", logo: img("640c381f0603f"),
    socials: { website: "https://teamliquid.com/", twitter: "https://x.com/LiquidValorant" },
    group: "alpha", seed: 2,
    players: [
      { pseudo: "nAts", country: RU, photo: "69735612b9b30", role: "SENTINEL", born: "2002-12-14", joined: "2023-11-15" },
      { pseudo: "purp0", country: RU, photo: "6973563baf5bc", role: "DUELIST", born: "2004-04-08", joined: "2025-11-20" },
      { pseudo: "kamo", country: PL, photo: "697355a36ffa7", role: "INITIATOR", born: "2003-07-26", joined: "2025-11-20" },
      { pseudo: "trexx", country: RU, photo: "67ab62d450b3c", role: "CONTROLLER", born: "2003-01-19", joined: "2025-01-08" },
      { pseudo: "Kicks", country: "Suède", photo: "677d6506baa65", role: "INITIATOR", born: "2001-10-05", joined: "2024-12-11" },
    ],
    coach: { pseudo: "LohaN", country: "Portugal", photo: "697356f3844e0", role: null, born: "1995-02-27", joined: "2025-11-20" },
  },
  {
    id: "vlr-th", name: "Team Heretics", tag: "TH", logo: img("637b755224c12"),
    socials: { website: "https://teamheretics.com/", twitter: "https://x.com/HereticsVal" },
    group: "alpha", seed: 3,
    players: [
      { pseudo: "Boo", country: LT, photo: "69778b1c2192b", role: "CONTROLLER", born: "1999-09-12", joined: "2023-10-30" },
      { pseudo: "koshmaras", country: LT, photo: null, role: "INITIATOR", born: "2004-06-21", joined: "2026-01-05" },
      { pseudo: "Wo0t", country: TR, photo: "69778b5885054", role: "DUELIST", born: "2006-03-16", joined: "2024-11-04" },
      { pseudo: "RieNs", country: TR, photo: "69778b71c9366", role: "SENTINEL", born: "2004-02-08", joined: "2024-11-04" },
      { pseudo: "benjyfishy", country: UK, photo: "69778b2bf3e20", role: "INITIATOR", born: "2004-05-31", joined: "2023-10-30" },
    ],
    coach: { pseudo: "neilzinho", country: "Canada", photo: "69778b4dbd0a9", role: null, born: "1994-08-19", joined: "2023-10-30" },
  },
  {
    id: "vlr-gm", name: "Gentle Mates", tag: "GM", logo: img("6670153fa9120"),
    socials: { website: "https://gentlemates.fr/", twitter: "https://x.com/gentlemates" },
    group: "alpha", seed: 4,
    players: [
      { pseudo: "starxo", country: PL, photo: "697767895bac5", role: "DUELIST", born: "2001-11-09", joined: "2024-10-22" },
      { pseudo: "Proxh", country: TR, photo: "679c760fde2dd", role: "INITIATOR", born: "2005-01-27", joined: "2025-12-15" },
      { pseudo: "bipo", country: "Canada", photo: "697767f365fc0", role: "SENTINEL", born: "2003-03-30", joined: "2025-11-28" },
      { pseudo: "marteen", country: CZ, photo: "6977651551705", role: "INITIATOR", born: "2004-07-14", joined: "2024-10-22" },
      { pseudo: "Minny", country: CZ, photo: "697765bb6904c", role: "CONTROLLER", born: "2002-05-06", joined: "2025-11-28" },
    ],
    coach: { pseudo: "KUNDIKUNDI", country: CZ, photo: "6977694c5cf17", role: null, born: "1997-01-23", joined: "2024-10-22" },
  },
  {
    id: "vlr-fnc", name: "FNATIC", tag: "FNC", logo: img("62a40cc2b5e29"),
    socials: { website: "https://fnatic.com/", twitter: "https://x.com/FNATIC" },
    group: "omega", seed: 1,
    players: [
      { pseudo: "Boaster", country: UK, photo: "687e2c495dcc6", role: "CONTROLLER", born: "1998-03-27", joined: "2021-01-14" },
      { pseudo: "crashies", country: "États-Unis", photo: "687e2c376a05d", role: "INITIATOR", born: "1999-12-02", joined: "2023-11-08" },
      { pseudo: "kaajak", country: PL, photo: "687e2c5192fe5", role: "DUELIST", born: "2005-04-18", joined: "2025-10-09" },
      { pseudo: "Cloud", country: RU, photo: "646bd06211000", role: "INITIATOR", born: "2003-08-25", joined: "2026-01-20" },
      { pseudo: "Alfajer", country: TR, photo: "687e2c40ac175", role: "SENTINEL", born: "2005-01-11", joined: "2022-01-06" },
    ],
    coach: { pseudo: "ENGH", country: null, photo: "60a0cf472d122", role: null, born: null, joined: "2021-11-30" },
  },
  {
    id: "vlr-vit", name: "Team Vitality", tag: "VIT", logo: img("6466d79e1ed40"),
    socials: { website: "https://vitality.gg/", twitter: "https://x.com/TeamVitalityVAL" },
    group: "omega", seed: 2,
    players: [
      { pseudo: "Jamppi", country: "Finlande", photo: "6977a6f130128", role: "INITIATOR", born: "2001-06-11", joined: "2023-11-02" },
      { pseudo: "PROFEK", country: PL, photo: "6977a6e4ea727", role: "SENTINEL", born: "2000-10-20", joined: "2025-11-12" },
      { pseudo: "Derke", country: RU, photo: "6977a70c4ff1b", role: "DUELIST", born: "2001-09-01", joined: "2023-11-02" },
      { pseudo: "Chronicle", country: RU, photo: "6977a6d8e354a", role: "CONTROLLER", born: "2000-11-25", joined: "2025-11-12" },
      { pseudo: "Sayonara", country: "Roumanie", photo: "6977a7018811e", role: "INITIATOR", born: "2004-03-09", joined: "2025-11-12" },
    ],
    coach: { pseudo: "PAL", country: UK, photo: "6977a7159f173", role: null, born: "1993-07-15", joined: "2024-11-18" },
  },
  {
    id: "vlr-bbl", name: "BBL Esports", tag: "BBL", logo: img("65b8ccef5e273"),
    socials: { website: "https://bblesports.com/", twitter: "https://x.com/BBL_Esports", instagram: "https://instagram.com/bblespor" },
    group: "omega", seed: 3,
    players: [
      { pseudo: "Rosé", country: TR, photo: "6979757c1322c", role: "DUELIST", born: "2003-02-19", joined: "2024-11-27" },
      { pseudo: "Crewen", country: TR, photo: "69797451d6733", role: "CONTROLLER", born: "2002-08-07", joined: "2023-12-06" },
      { pseudo: "Lar0k", country: TR, photo: "697974e4d16d5", role: "INITIATOR", born: "2005-05-23", joined: "2025-11-19" },
      { pseudo: "Loita", country: TR, photo: "6979752e8d3fa", role: "SENTINEL", born: "2001-12-28", joined: "2024-11-27" },
      { pseudo: "lovers rock", country: TR, photo: "697975c71d41b", role: "INITIATOR", born: "2004-10-16", joined: "2026-01-09" },
    ],
    coach: { pseudo: "KEY", country: TR, photo: "69797492d5ce7", role: null, born: "1996-11-03", joined: "2023-12-06" },
  },
  {
    id: "vlr-ef", name: "Eternal Fire", tag: "EF", logo: img("6628980dcdaea"),
    socials: { twitter: "https://x.com/eternalfiregg" },
    group: "omega", seed: 4,
    players: [
      { pseudo: "nekky", country: TR, photo: "69e22617e9dba", role: "DUELIST", born: "2004-01-30", joined: "2024-12-03" },
      { pseudo: "Spear", country: TR, photo: "69c98fc775fe3", role: "INITIATOR", born: "2005-09-08", joined: "2026-07-22" },
      { pseudo: "audaz", country: TR, photo: "69e2266f85fd8", role: "CONTROLLER", born: "2002-04-25", joined: "2024-12-03" },
      { pseudo: "Favian", country: TR, photo: "69e226459b5e0", role: "SENTINEL", born: "2003-06-13", joined: "2025-11-25" },
      { pseudo: "echo", country: TR, photo: "69e226559a674", role: "INITIATOR", born: "2001-03-21", joined: "2023-11-29" },
    ],
    coach: { pseudo: "afr0nfire", country: TR, photo: "69e2267b850ee", role: null, born: "1995-06-17", joined: "2023-11-29" },
  },
];

const GRP_ALPHA = "vlr-grp-alpha";
const GRP_OMEGA = "vlr-grp-omega";

// Matchs de poule (terminés) : [teamA, teamB, scoreA, scoreB, jour d'avril]
const GROUP_MATCHES: [string, string, number, number, number][] = [
  // Poule Alpha
  ["vlr-fut", "vlr-tl", 1, 2, 5], ["vlr-fut", "vlr-th", 2, 0, 8], ["vlr-fut", "vlr-gm", 2, 1, 12],
  ["vlr-tl", "vlr-th", 2, 0, 15], ["vlr-tl", "vlr-gm", 1, 2, 19], ["vlr-th", "vlr-gm", 2, 1, 22],
  // Poule Omega
  ["vlr-fnc", "vlr-ef", 2, 0, 6], ["vlr-fnc", "vlr-vit", 2, 1, 9], ["vlr-fnc", "vlr-bbl", 2, 0, 13],
  ["vlr-ef", "vlr-vit", 1, 2, 16], ["vlr-ef", "vlr-bbl", 1, 2, 20], ["vlr-vit", "vlr-bbl", 2, 0, 23],
];

// Playoffs : [teamA, teamB, scoreA, scoreB, round, position, jour de mai, terminé?]
// Vrai bracket double-élimination à 4 équipes (qualifiés : 2 premiers de chaque
// poule). Perdants des demis UB → LB Round 1, puis LB Finale contre le perdant
// de la finale UB, puis Grande Finale.
// Le split est joué jusqu'au bout : chaque match a un score, donc chaque match
// peut recevoir un scoreboard simulé. Le BO5 est réservé à la grande finale.
const BRACKET_MATCHES: [string, string, number, number, string, number, number, number][] = [
  ["vlr-fnc", "vlr-fut", 2, 0, "UB Demi-finale", 1, 7, 3], // fut → LB
  ["vlr-vit", "vlr-tl", 2, 1, "UB Demi-finale", 2, 8, 3], // tl → LB
  ["vlr-fut", "vlr-tl", 1, 2, "LB Round 1", 3, 9, 3], // tl survit
  ["vlr-fnc", "vlr-vit", 2, 1, "UB Finale", 4, 12, 3], // vit → LB Finale
  ["vlr-tl", "vlr-vit", 0, 2, "LB Finale", 5, 14, 3], // vit revient
  ["vlr-fnc", "vlr-vit", 3, 2, "Grande Finale", 6, 17, 5],
];

const groupOf = (t: TeamSeed) => (t.group === "alpha" ? GRP_ALPHA : GRP_OMEGA);
const winner = (a: string, b: string, sa: number, sb: number) =>
  sa === sb ? null : sa > sb ? a : b;

async function main() {
  // --- Nettoyage idempotent ---
  await db.tournament.deleteMany({ where: { id: TID } }); // cascade groups/participants/matches
  await db.team.deleteMany({ where: { id: { in: TEAMS.map((t) => t.id) } } }); // cascade memberships
  await db.player.deleteMany({ where: { id: { startsWith: "vlr-p-" } } });

  // --- Tournoi ---
  await db.tournament.create({
    data: {
      id: TID,
      name: "VCT 2026: EMEA Stage 1",
      region: "EMEA",
      format: "GROUPS_THEN_ELIM",
      status: "ONGOING",
      startDate: new Date("2026-04-01T00:00:00Z"),
      endDate: new Date("2026-05-17T00:00:00Z"),
      prizePool: "$250 000",
      organizer: "Riot Games",
      description: "Import de démonstration depuis vlr.gg - Riot Games Arena, Berlin.",
    },
  });

  await db.group.createMany({
    data: [
      { id: GRP_ALPHA, tournamentId: TID, name: "Poule Alpha" },
      { id: GRP_OMEGA, tournamentId: TID, name: "Poule Omega" },
    ],
  });

  // --- Équipes + rosters + participations ---
  for (const t of TEAMS) {
    await db.team.create({
      data: {
        id: t.id, name: t.name, tag: t.tag, logo: t.logo,
        socials: t.socials, region: "EMEA", status: "ACTIVE",
      },
    });
    const squad: [string, PersonSeed][] = [
      ...t.players.map((p, i): [string, PersonSeed] => [`vlr-p-${t.id}-${i}`, p]),
      [`vlr-p-${t.id}-c`, t.coach],
    ];
    await db.player.createMany({
      data: squad.map(([id, p]) => ({
        id,
        pseudo: p.pseudo,
        nationality: p.country,
        photo: p.photo ? img(p.photo) : null,
        valorantRole: p.role,
        birthdate: p.born ? new Date(`${p.born}T00:00:00Z`) : null,
      })),
    });
    await db.teamMembership.createMany({
      data: squad.map(([id, p], i) => ({
        teamId: t.id,
        playerId: id,
        role: i === squad.length - 1 ? ("COACH" as const) : ("JOUEUR" as const),
        joinDate: new Date(`${p.joined}T00:00:00Z`),
      })),
    });
    await db.tournamentParticipant.create({
      data: { tournamentId: TID, teamId: t.id, seed: t.seed, groupId: groupOf(t) },
    });
  }

  // --- Matchs de poule ---
  for (const [a, b, sa, sb, day] of GROUP_MATCHES) {
    const grp = TEAMS.find((t) => t.id === a)!.group === "alpha" ? GRP_ALPHA : GRP_OMEGA;
    await db.match.create({
      data: {
        tournamentId: TID,
        groupId: grp,
        teamAId: a,
        teamBId: b,
        scoreA: sa,
        scoreB: sb,
        stage: "GROUP" as MatchStage,
        status: "FINISHED" as MatchStatus,
        bestOf: 3,
        date: new Date(`2026-04-${String(day).padStart(2, "0")}T18:00:00Z`),
        winnerId: winner(a, b, sa, sb),
      },
    });
  }

  // --- Matchs de playoffs ---
  for (const [a, b, sa, sb, round, pos, day, bestOf] of BRACKET_MATCHES) {
    await db.match.create({
      data: {
        tournamentId: TID,
        teamAId: a,
        teamBId: b,
        scoreA: sa,
        scoreB: sb,
        stage: "BRACKET" as MatchStage,
        status: "FINISHED" as MatchStatus,
        bestOf,
        round,
        bracketPosition: pos,
        date: new Date(`2026-05-${String(day).padStart(2, "0")}T18:00:00Z`),
        winnerId: winner(a, b, sa, sb),
      },
    });
  }

  console.log(`OK - tournoi ${TID} importé : ${TEAMS.length} équipes, ${GROUP_MATCHES.length} matchs de poule, ${BRACKET_MATCHES.length} playoffs.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
