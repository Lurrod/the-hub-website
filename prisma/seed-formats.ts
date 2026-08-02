import { PrismaClient, type MatchStage, type MatchStatus, type TournamentFormat, type TournamentStatus } from "@prisma/client";

const db = new PrismaClient();

/**
 * Un tournoi de démonstration par format, pour vérifier d'un coup d'œil le
 * rendu de chaque géométrie (arbre simple, double élimination, poules, suisse,
 * round robin, ligue).
 *
 * Réexécutable : chaque tournoi est supprimé puis recréé (les poules, matchs
 * et inscriptions tombent en cascade). N'y mettre que des données jetables.
 *
 * Les huit équipes utilisées sont celles qui portent un logo et un effectif
 * complet (5 joueurs + 1 coach), pour un rendu réaliste des fiches équipe.
 */

/** Équipes par seed : l'index sert de référence dans les tableaux de matchs. */
const TEAM_IDS = [
  "vlr-th", // 1
  "vlr-vit", // 2
  "vlr-fnc", // 3
  "vlr-tl", // 4
  "vlr-fut", // 5
  "vlr-bbl", // 6
  "vlr-gm", // 7
  "vlr-ef", // 8
];

type MatchSeed = {
  key: string;
  a: number;
  b: number;
  sa?: number;
  sb?: number;
  stage?: MatchStage;
  group?: string;
  round?: string;
  pos?: number;
  status?: MatchStatus;
  bestOf?: number;
  day: number;
  /** Détail des maps : [nom, score A, score B]. */
  maps?: [string, number, number][];
  vod?: string;
};

type GroupSeed = { key: string; name: string; teams: number[] };

type TournamentSeed = {
  id: string;
  name: string;
  format: TournamentFormat;
  status: TournamentStatus;
  description: string;
  prizePool: string;
  bestOf: number;
  groupSize?: number;
  teams: number[];
  groups?: GroupSeed[];
  matches: MatchSeed[];
  startDay: number;
  endDay: number;
};

const DAY = 24 * 60 * 60 * 1000;
const ORIGIN = new Date("2026-09-07T18:00:00Z").getTime();
const at = (day: number) => new Date(ORIGIN + day * DAY);

/** Toutes les paires d'un groupe d'index, dans un ordre stable. */
function roundRobin(teams: number[]): [number, number][] {
  const pairs: [number, number][] = [];
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) pairs.push([teams[i], teams[j]]);
  }
  return pairs;
}

/** Score déterministe : pas de hasard, le seed doit être reproductible. */
function score(i: number): [number, number] {
  const table: [number, number][] = [
    [2, 0],
    [2, 1],
    [1, 2],
    [0, 2],
  ];
  return table[i % table.length];
}

/** Matchs de poule d'un groupe : round robin complet, tous joués. */
function groupMatches(group: GroupSeed, startDay: number, played = true): MatchSeed[] {
  return roundRobin(group.teams).map(([a, b], i) => {
    const [sa, sb] = score(i);
    return {
      key: `${group.key}-${i + 1}`,
      a,
      b,
      sa: played ? sa : 0,
      sb: played ? sb : 0,
      stage: "GROUP" as MatchStage,
      group: group.key,
      status: (played ? "FINISHED" : "SCHEDULED") as MatchStatus,
      day: startDay + i,
    };
  });
}

const POOL_A: GroupSeed = { key: "a", name: "Groupe A", teams: [0, 1, 2, 3] };
const POOL_B: GroupSeed = { key: "b", name: "Groupe B", teams: [4, 5, 6, 7] };

const TOURNAMENTS: TournamentSeed[] = [
  {
    id: "fmt-single-elim",
    name: "Hub Invitational - Élimination directe",
    format: "SINGLE_ELIM",
    status: "ONGOING",
    description: "Tableau à 8 équipes, une défaite et c'est terminé. La finale reste à jouer.",
    prizePool: "10 000 €",
    bestOf: 3,
    teams: [0, 1, 2, 3, 4, 5, 6, 7],
    startDay: 0,
    endDay: 6,
    matches: [
      {
        key: "qf1",
        round: "Quarts de finale",
        pos: 1,
        a: 0,
        b: 7,
        sa: 2,
        sb: 0,
        status: "FINISHED",
        day: 0,
        maps: [
          ["Ascent", 13, 10],
          ["Bind", 13, 8],
        ],
        vod: "https://www.twitch.tv/videos/2200000001",
      },
      { key: "qf2", round: "Quarts de finale", pos: 2, a: 3, b: 4, sa: 1, sb: 2, status: "FINISHED", day: 0 },
      { key: "qf3", round: "Quarts de finale", pos: 3, a: 1, b: 6, sa: 2, sb: 1, status: "FINISHED", day: 1 },
      { key: "qf4", round: "Quarts de finale", pos: 4, a: 2, b: 5, sa: 2, sb: 0, status: "FINISHED", day: 1 },
      { key: "sf1", round: "Demi-finales", pos: 1, a: 0, b: 4, sa: 2, sb: 1, status: "FINISHED", day: 3 },
      { key: "sf2", round: "Demi-finales", pos: 2, a: 1, b: 2, sa: 0, sb: 2, status: "FINISHED", day: 3 },
      { key: "f1", round: "Finale", pos: 1, a: 0, b: 2, status: "SCHEDULED", bestOf: 5, day: 6 },
    ],
  },
  {
    id: "fmt-double-elim",
    name: "Hub Masters - Double élimination",
    format: "DOUBLE_ELIM",
    status: "ONGOING",
    description: "Upper et lower bracket : il faut deux défaites pour sortir. Grande finale à venir.",
    prizePool: "25 000 €",
    bestOf: 3,
    teams: [0, 1, 2, 3, 4, 5, 6, 7],
    startDay: 10,
    endDay: 18,
    matches: [
      { key: "ub-qf1", round: "UB Quarts de finale", pos: 1, a: 0, b: 7, sa: 2, sb: 0, status: "FINISHED", day: 10 },
      { key: "ub-qf2", round: "UB Quarts de finale", pos: 2, a: 3, b: 4, sa: 1, sb: 2, status: "FINISHED", day: 10 },
      { key: "ub-qf3", round: "UB Quarts de finale", pos: 3, a: 1, b: 6, sa: 2, sb: 1, status: "FINISHED", day: 11 },
      { key: "ub-qf4", round: "UB Quarts de finale", pos: 4, a: 2, b: 5, sa: 2, sb: 0, status: "FINISHED", day: 11 },
      { key: "ub-sf1", round: "UB Demi-finales", pos: 1, a: 0, b: 4, sa: 2, sb: 1, status: "FINISHED", day: 13 },
      { key: "ub-sf2", round: "UB Demi-finales", pos: 2, a: 1, b: 2, sa: 0, sb: 2, status: "FINISHED", day: 13 },
      {
        key: "ub-f",
        round: "UB Finale",
        pos: 1,
        a: 0,
        b: 2,
        sa: 1,
        sb: 2,
        status: "FINISHED",
        day: 16,
        maps: [
          ["Lotus", 13, 11],
          ["Sunset", 9, 13],
          ["Haven", 10, 13],
        ],
        vod: "https://www.twitch.tv/videos/2200000002",
      },
      { key: "lb-r1-1", round: "LB Round 1", pos: 1, a: 7, b: 3, sa: 2, sb: 0, status: "FINISHED", day: 12 },
      { key: "lb-r1-2", round: "LB Round 1", pos: 2, a: 6, b: 5, sa: 1, sb: 2, status: "FINISHED", day: 12 },
      { key: "lb-r2-1", round: "LB Round 2", pos: 1, a: 4, b: 7, sa: 2, sb: 1, status: "FINISHED", day: 14 },
      { key: "lb-r2-2", round: "LB Round 2", pos: 2, a: 1, b: 5, sa: 2, sb: 0, status: "FINISHED", day: 14 },
      { key: "lb-r3", round: "LB Round 3", pos: 1, a: 4, b: 1, sa: 1, sb: 2, status: "FINISHED", day: 15 },
      { key: "lb-f", round: "LB Finale", pos: 1, a: 0, b: 1, sa: 2, sb: 1, status: "FINISHED", day: 17 },
      { key: "gf", round: "Grande Finale", pos: 1, a: 2, b: 0, status: "SCHEDULED", bestOf: 5, day: 18 },
    ],
  },
  {
    id: "fmt-groups",
    name: "Hub Group Stage - Poules",
    format: "GROUPS",
    status: "FINISHED",
    description: "Deux poules de quatre, chaque équipe affronte les trois autres. Classement par points.",
    prizePool: "5 000 €",
    bestOf: 3,
    groupSize: 4,
    teams: [0, 1, 2, 3, 4, 5, 6, 7],
    groups: [POOL_A, POOL_B],
    startDay: -20,
    endDay: -8,
    matches: [...groupMatches(POOL_A, -20), ...groupMatches(POOL_B, -14)],
  },
  {
    id: "fmt-groups-elim",
    name: "Hub Championship - Poules puis playoffs",
    format: "GROUPS_THEN_ELIM",
    status: "ONGOING",
    description: "Phase de poules qualificative, les deux premiers de chaque groupe rejoignent les playoffs.",
    prizePool: "40 000 €",
    bestOf: 3,
    groupSize: 4,
    teams: [0, 1, 2, 3, 4, 5, 6, 7],
    groups: [POOL_A, POOL_B],
    startDay: 20,
    endDay: 34,
    matches: [
      ...groupMatches(POOL_A, 20),
      ...groupMatches(POOL_B, 26),
      { key: "sf1", round: "Demi-finales", pos: 1, a: 0, b: 5, sa: 2, sb: 1, status: "FINISHED", day: 32 },
      { key: "sf2", round: "Demi-finales", pos: 2, a: 4, b: 1, sa: 0, sb: 2, status: "FINISHED", day: 32 },
      { key: "f1", round: "Finale", pos: 1, a: 0, b: 1, status: "SCHEDULED", bestOf: 5, day: 34 },
    ],
  },
  {
    id: "fmt-swiss",
    name: "Hub Swiss Open - Système suisse",
    format: "SWISS",
    status: "ONGOING",
    description: "Trois rondes appariées par score, sans élimination directe. La dernière ronde reste à jouer.",
    prizePool: "8 000 €",
    bestOf: 1,
    teams: [0, 1, 2, 3, 4, 5, 6, 7],
    groups: [{ key: "swiss", name: "Système suisse", teams: [0, 1, 2, 3, 4, 5, 6, 7] }],
    startDay: 40,
    endDay: 44,
    matches: [
      // Ronde 1 : appariement par seed
      { key: "r1-1", group: "swiss", a: 0, b: 4, sa: 1, sb: 0, status: "FINISHED", day: 40 },
      { key: "r1-2", group: "swiss", a: 1, b: 5, sa: 1, sb: 0, status: "FINISHED", day: 40 },
      { key: "r1-3", group: "swiss", a: 2, b: 6, sa: 0, sb: 1, status: "FINISHED", day: 40 },
      { key: "r1-4", group: "swiss", a: 3, b: 7, sa: 1, sb: 0, status: "FINISHED", day: 40 },
      // Ronde 2 : vainqueurs entre eux, perdants entre eux
      { key: "r2-1", group: "swiss", a: 0, b: 1, sa: 1, sb: 0, status: "FINISHED", day: 42 },
      { key: "r2-2", group: "swiss", a: 6, b: 3, sa: 0, sb: 1, status: "FINISHED", day: 42 },
      { key: "r2-3", group: "swiss", a: 4, b: 5, sa: 1, sb: 0, status: "FINISHED", day: 42 },
      { key: "r2-4", group: "swiss", a: 2, b: 7, sa: 1, sb: 0, status: "FINISHED", day: 42 },
      // Ronde 3 : à jouer
      { key: "r3-1", group: "swiss", a: 0, b: 3, status: "SCHEDULED", day: 44 },
      { key: "r3-2", group: "swiss", a: 1, b: 6, status: "SCHEDULED", day: 44 },
      { key: "r3-3", group: "swiss", a: 4, b: 2, status: "SCHEDULED", day: 44 },
      { key: "r3-4", group: "swiss", a: 5, b: 7, status: "SCHEDULED", day: 44 },
    ],
  },
  {
    id: "fmt-round-robin",
    name: "Hub Round Robin Cup",
    format: "ROUND_ROBIN",
    status: "FINISHED",
    description: "Six équipes, toutes s'affrontent une fois, classement global sur l'ensemble des matchs.",
    prizePool: "6 000 €",
    bestOf: 3,
    teams: [0, 1, 2, 3, 4, 5],
    groups: [{ key: "rr", name: "Classement général", teams: [0, 1, 2, 3, 4, 5] }],
    startDay: -60,
    endDay: -46,
    matches: groupMatches({ key: "rr", name: "Classement général", teams: [0, 1, 2, 3, 4, 5] }, -60),
  },
  {
    id: "fmt-league",
    name: "Hub Pro League - Saison 1",
    format: "LEAGUE",
    status: "ONGOING",
    description: "Championnat aller-retour à quatre équipes, classement cumulé sur la saison.",
    prizePool: "15 000 €",
    bestOf: 3,
    teams: [0, 1, 2, 3],
    groups: [{ key: "league", name: "Saison régulière", teams: [0, 1, 2, 3] }],
    startDay: 50,
    endDay: 72,
    matches: [
      // Journées aller (jouées)
      ...roundRobin([0, 1, 2, 3]).map(([a, b], i): MatchSeed => {
        const [sa, sb] = score(i);
        return {
          key: `aller-${i + 1}`,
          a,
          b,
          sa,
          sb,
          group: "league",
          status: "FINISHED",
          day: 50 + i * 2,
        };
      }),
      // Journées retour (à jouer, équipes inversées)
      ...roundRobin([0, 1, 2, 3]).map(([a, b], i): MatchSeed => ({
        key: `retour-${i + 1}`,
        a: b,
        b: a,
        group: "league",
        status: "SCHEDULED",
        day: 62 + i * 2,
      })),
    ],
  },
];

async function seedTournament(t: TournamentSeed) {
  // Suppression en cascade : poules, inscriptions et matchs partent avec.
  await db.tournament.deleteMany({ where: { id: t.id } });

  await db.tournament.create({
    data: {
      id: t.id,
      name: t.name,
      region: "EU",
      format: t.format,
      status: t.status,
      organizer: "The Hub",
      description: t.description,
      prizePool: t.prizePool,
      maxTeams: t.teams.length,
      groupSize: t.groupSize ?? null,
      bestOf: t.bestOf,
      seeding: "MANUAL",
      startDate: at(t.startDay),
      endDate: at(t.endDay),
    },
  });

  const groupIdOf = new Map<string, string>();
  for (const g of t.groups ?? []) {
    const id = `${t.id}-g-${g.key}`;
    await db.group.create({ data: { id, tournamentId: t.id, name: g.name } });
    groupIdOf.set(g.key, id);
  }

  const groupOfTeam = new Map<number, string>();
  for (const g of t.groups ?? []) {
    for (const idx of g.teams) groupOfTeam.set(idx, groupIdOf.get(g.key)!);
  }

  await db.tournamentParticipant.createMany({
    data: t.teams.map((idx, i) => ({
      id: `${t.id}-p-${idx}`,
      tournamentId: t.id,
      teamId: TEAM_IDS[idx],
      seed: i + 1,
      groupId: groupOfTeam.get(idx) ?? null,
    })),
  });

  await db.match.createMany({
    data: t.matches.map((m) => {
      const sa = m.sa ?? 0;
      const sb = m.sb ?? 0;
      const finished = (m.status ?? "SCHEDULED") === "FINISHED";
      return {
        id: `${t.id}-m-${m.key}`,
        tournamentId: t.id,
        groupId: m.group ? (groupIdOf.get(m.group) ?? null) : null,
        teamAId: TEAM_IDS[m.a],
        teamBId: TEAM_IDS[m.b],
        scoreA: sa,
        scoreB: sb,
        winnerId: finished && sa !== sb ? TEAM_IDS[sa > sb ? m.a : m.b] : null,
        stage: m.stage ?? (m.round ? "BRACKET" : "GROUP"),
        round: m.round ?? null,
        bracketPosition: m.pos ?? null,
        bestOf: m.bestOf ?? t.bestOf,
        status: m.status ?? "SCHEDULED",
        date: at(m.day),
        vodUrl: m.vod ?? null,
      };
    }),
  });

  const maps = t.matches.flatMap((m) =>
    (m.maps ?? []).map(([mapName, scoreA, scoreB], j) => ({
      id: `${t.id}-m-${m.key}-map-${j}`,
      matchId: `${t.id}-m-${m.key}`,
      mapName,
      scoreA,
      scoreB,
      order: j,
    }))
  );
  if (maps.length > 0) await db.matchMap.createMany({ data: maps });

  return t.matches.length;
}

async function main() {
  const teams = await db.team.findMany({ where: { id: { in: TEAM_IDS } }, select: { id: true } });
  const missing = TEAM_IDS.filter((id) => !teams.some((t) => t.id === id));
  if (missing.length > 0) {
    throw new Error(
      `Équipes absentes : ${missing.join(", ")}. Lance d'abord « npm run db:seed:vlr ».`
    );
  }

  for (const t of TOURNAMENTS) {
    const count = await seedTournament(t);
    process.stdout.write(`${t.format.padEnd(17)} ${t.id.padEnd(18)} ${count} matchs\n`);
  }
  process.stdout.write(`Seed formats : ${TOURNAMENTS.length} tournois prêts.\n`);

  // `--prune` : ne laisse que les tournois de démonstration des formats. Les
  // poules, inscriptions et matchs des autres partent en cascade. Destructif,
  // donc explicite : à réserver à une base de développement.
  if (process.argv.includes("--prune")) {
    const keep = TOURNAMENTS.map((t) => t.id);
    const removed = await db.tournament.findMany({
      where: { id: { notIn: keep } },
      select: { id: true, name: true },
    });
    if (removed.length === 0) {
      process.stdout.write("Prune : aucun autre tournoi.\n");
      return;
    }
    await db.tournament.deleteMany({ where: { id: { notIn: keep } } });
    for (const t of removed) process.stdout.write(`  supprimé  ${t.id} (${t.name})\n`);
    process.stdout.write(`Prune : ${removed.length} tournois supprimés.\n`);
  }
}

main().finally(() => db.$disconnect());
