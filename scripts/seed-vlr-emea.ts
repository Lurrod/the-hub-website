/**
 * Seed de démonstration : importe « VCT 2026: EMEA Stage 1 » (données publiques
 * vlr.gg) — 8 équipes avec logos + rosters, 2 poules, classements, et un bracket
 * de playoffs. Idempotent : supprime puis recrée les entrées préfixées « vlr- ».
 *
 * Lancer :  npx tsx scripts/seed-vlr-emea.ts
 */
import { PrismaClient, type MatchStage, type MatchStatus } from "@prisma/client";

const db = new PrismaClient();

const TID = "vlr-emea-s1";
const logo = (h: string) => `https://owcdn.net/img/${h}.png`;

type TeamSeed = {
  id: string;
  name: string;
  tag: string;
  logo: string;
  group: "alpha" | "omega";
  seed: number;
  players: string[];
  coach: string;
};

const TEAMS: TeamSeed[] = [
  { id: "vlr-fut", name: "FUT Esports", tag: "FUT", logo: logo("632be9976b8fe"), group: "alpha", seed: 1, players: ["sociablEE", "s0pp", "xeus", "yetujey", "KROSTALY"], coach: "Vlad" },
  { id: "vlr-tl", name: "Team Liquid", tag: "TL", logo: logo("640c381f0603f"), group: "alpha", seed: 2, players: ["nAts", "purp0", "kamo", "trexx", "Kicks"], coach: "LohaN" },
  { id: "vlr-th", name: "Team Heretics", tag: "TH", logo: logo("637b755224c12"), group: "alpha", seed: 3, players: ["Boo", "koshmaras", "Wo0t", "RieNs", "benjyfishy"], coach: "neilzinho" },
  { id: "vlr-gm", name: "Gentle Mates", tag: "GM", logo: logo("6670153fa9120"), group: "alpha", seed: 4, players: ["starxo", "Proxh", "bipo", "marteen", "Minny"], coach: "KUNDIKUNDI" },
  { id: "vlr-fnc", name: "FNATIC", tag: "FNC", logo: logo("62a40cc2b5e29"), group: "omega", seed: 1, players: ["Boaster", "crashies", "kaajak", "Cloud", "Alfajer"], coach: "ENGH" },
  { id: "vlr-vit", name: "Team Vitality", tag: "VIT", logo: logo("6466d79e1ed40"), group: "omega", seed: 2, players: ["Jamppi", "PROFEK", "Derke", "Chronicle", "Sayonara"], coach: "PAL" },
  { id: "vlr-bbl", name: "BBL Esports", tag: "BBL", logo: logo("65b8ccef5e273"), group: "omega", seed: 3, players: ["Rosé", "Crewen", "Lar0k", "Loita", "lovers rock"], coach: "KEY" },
  { id: "vlr-ef", name: "Eternal Fire", tag: "EF", logo: logo("6628980dcdaea"), group: "omega", seed: 4, players: ["nekky", "Spear", "audaz", "Favian", "echo"], coach: "afr0nfire" },
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
const BRACKET_MATCHES: [string, string, number, number, string, number, number, boolean][] = [
  ["vlr-fnc", "vlr-fut", 2, 0, "UB Demi-finale", 1, 7, true], // fut → LB
  ["vlr-vit", "vlr-tl", 2, 1, "UB Demi-finale", 2, 8, true], // tl → LB
  ["vlr-fut", "vlr-tl", 0, 0, "LB Round 1", 3, 9, false], // perdants des demis UB
  ["vlr-fnc", "vlr-vit", 0, 0, "UB Finale", 4, 12, false], // perdant → LB Finale
  ["vlr-tl", "vlr-vit", 0, 0, "LB Finale", 5, 14, false], // vainqueur LB R1 vs perdant UB Finale
  ["vlr-fnc", "vlr-vit", 0, 0, "Grande Finale", 6, 17, false],
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
      description: "Import de démonstration depuis vlr.gg — Riot Games Arena, Berlin.",
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
      data: { id: t.id, name: t.name, tag: t.tag, logo: t.logo, region: "EMEA", status: "ACTIVE" },
    });
    await db.player.createMany({
      data: [
        ...t.players.map((p, i) => ({ id: `vlr-p-${t.id}-${i}`, pseudo: p, nationality: null })),
        { id: `vlr-p-${t.id}-c`, pseudo: t.coach, nationality: null },
      ],
    });
    await db.teamMembership.createMany({
      data: [
        ...t.players.map((_, i) => ({ teamId: t.id, playerId: `vlr-p-${t.id}-${i}`, role: "JOUEUR" as const })),
        { teamId: t.id, playerId: `vlr-p-${t.id}-c`, role: "COACH" as const },
      ],
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
  for (const [a, b, sa, sb, round, pos, day, done] of BRACKET_MATCHES) {
    await db.match.create({
      data: {
        tournamentId: TID,
        teamAId: a,
        teamBId: b,
        scoreA: sa,
        scoreB: sb,
        stage: "BRACKET" as MatchStage,
        status: (done ? "FINISHED" : "SCHEDULED") as MatchStatus,
        bestOf: 3,
        round,
        bracketPosition: pos,
        date: new Date(`2026-05-${String(day).padStart(2, "0")}T18:00:00Z`),
        winnerId: done ? winner(a, b, sa, sb) : null,
      },
    });
  }

  console.log(`OK — tournoi ${TID} importé : ${TEAMS.length} équipes, ${GROUP_MATCHES.length} matchs de poule, ${BRACKET_MATCHES.length} playoffs.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
