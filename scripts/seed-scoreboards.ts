/**
 * Simulation de scoreboards (façon vlr.gg) sur les matchs terminés du tournoi
 * de démonstration « VCT 2026: EMEA Stage 1 » (vlr-emea-s1).
 *
 * Génère par carte : un scoreboard complet (rating, ACS, K/D/A, +/-, KAST, ADR,
 * first kills / first deaths, +/-) et une timeline de rounds gagnés/perdus avec la
 * raison de victoire. Marque le match `statsStatus = "MATCHED"`. Idempotent.
 *
 * Usage : npm run db:seed:scoreboards   (après db:seed:vlr)
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const TID = "vlr-emea-s1";

const MAP_POOL = ["Ascent", "Haven", "Bind", "Split", "Lotus", "Sunset", "Icebox", "Abyss", "Corrode"];
const AGENT_POOL = [
  "Jett", "Raze", "Phoenix", "Neon", "Yoru",
  "Omen", "Brimstone", "Astra", "Harbor", "Clove",
  "Sova", "Breach", "Skye", "KAY/O", "Fade",
  "Killjoy", "Cypher", "Chamber", "Sage", "Vyse",
];
const OUTCOMES = ["elim", "elim", "elim", "elim", "elim", "detonate", "detonate", "defuse", "time"] as const;

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Rating 2.0 - portage de la formule HLTV 2.0 adaptée à Valorant utilisée sur le site flhub
 * (services/rating.py). Le coefficient ADR est rescalé de CS (0.0032) à Valorant (0.00171)
 * pour recentrer le joueur moyen autour de ~1.00. Plancher à 0.01, jamais négatif ni nul.
 */
function computeRating2(s: {
  rounds: number;
  kills: number;
  deaths: number;
  assists: number;
  kastPct: number;
  adr: number;
}): number {
  if (s.rounds <= 0) return 0;
  const kpr = s.kills / s.rounds;
  const dpr = s.deaths / s.rounds;
  const apr = s.assists / s.rounds;
  const impact = 2.13 * kpr + 0.42 * apr - 0.41;
  const rating =
    0.0073 * s.kastPct +
    0.3591 * kpr -
    0.5329 * dpr +
    0.2372 * impact +
    0.00171 * s.adr -
    0.001;
  return Math.round(Math.max(0.01, rating) * 100) / 100;
}
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Ordre des vainqueurs de cartes : cartes du perdant d'abord, dernière au vainqueur. */
function mapWinners(mapsA: number, mapsB: number): ("A" | "B")[] {
  const seriesWinner: "A" | "B" = mapsA > mapsB ? "A" : "B";
  const list: ("A" | "B")[] = [...Array(mapsA).fill("A"), ...Array(mapsB).fill("B")];
  list.splice(list.indexOf(seriesWinner), 1);
  return [...shuffle(list), seriesWinner];
}

type Row = {
  riotName: string;
  playerId: string;
  teamSide: "A" | "B";
  agent: string;
  kills: number;
  deaths: number;
  assists: number;
  acs: number;
  adr: number;
  hsPct: number;
  rating: number;
  kast: number;
  firstKills: number;
  firstDeaths: number;
};

function baseRow(
  pseudo: string,
  playerId: string,
  side: "A" | "B",
  agent: string,
  won: boolean,
  rounds: number,
  starTier: number
): Row {
  const boost = won ? 1.12 : 0.92;
  const star = 1.15 - starTier * 0.06;
  const acs = Math.round(rand(150, 270) * boost * star);
  const kills = Math.max(4, Math.round(acs / 12 + rand(-2, 3)));
  const deaths = Math.max(4, Math.round((rounds * (won ? rand(45, 62) : rand(55, 75))) / 100));
  const assists = rand(2, 9);
  const adr = Math.round(acs * (rand(55, 66) / 100));
  const hsPct = rand(14, 38);
  const kast = clamp(Math.round((won ? 74 : 66) + rand(-8, 12)), 45, 95);
  // Rating 2.0 flhub - dérivé des stats réelles du joueur (formule HLTV 2.0 Valorant).
  const rating = computeRating2({ rounds, kills, deaths, assists, kastPct: kast, adr });
  return {
    riotName: pseudo, playerId, teamSide: side, agent,
    kills, deaths, assists, acs, adr, hsPct, kast, rating,
    firstKills: 0, firstDeaths: 0,
  };
}

/** Distribue `rounds` first kills et `rounds` first deaths sur les joueurs (biais entrée). */
function distributeFirsts(rows: Row[], rounds: number) {
  // Poids d'entrée : les 2 premiers joueurs de chaque équipe font plus d'entrées.
  const fkWeights = rows.map((r, i) => (i % 5 < 2 ? 3 : 1) * (r.kills > 15 ? 1.4 : 1));
  const fdWeights = rows.map((r, i) => (i % 5 < 2 ? 3 : 1) * (r.deaths > 14 ? 1.3 : 1));
  const pick = (weights: number[]) => {
    const total = weights.reduce((s, w) => s + w, 0);
    let x = Math.random() * total;
    for (let i = 0; i < weights.length; i++) {
      x -= weights[i];
      if (x <= 0) return i;
    }
    return weights.length - 1;
  };
  for (let r = 0; r < rounds; r++) {
    rows[pick(fkWeights)].firstKills += 1;
    rows[pick(fdWeights)].firstDeaths += 1;
  }
}

async function main() {
  const matches = await db.match.findMany({
    where: { tournamentId: TID, status: "FINISHED" },
    select: { id: true, teamAId: true, teamBId: true, scoreA: true, scoreB: true },
  });

  let done = 0;
  for (const m of matches) {
    const [rosterA, rosterB] = await Promise.all([
      db.teamMembership.findMany({
        where: { teamId: m.teamAId, role: "JOUEUR", leaveDate: null },
        select: { playerId: true, player: { select: { pseudo: true } } }, take: 5,
      }),
      db.teamMembership.findMany({
        where: { teamId: m.teamBId, role: "JOUEUR", leaveDate: null },
        select: { playerId: true, player: { select: { pseudo: true } } }, take: 5,
      }),
    ]);
    if (rosterA.length < 5 || rosterB.length < 5) continue;
    if (m.scoreA + m.scoreB === 0) continue;

    const winners = mapWinners(m.scoreA, m.scoreB);
    const mapNames = shuffle(MAP_POOL).slice(0, winners.length);

    await db.$transaction(async (tx) => {
      await tx.matchMap.deleteMany({ where: { matchId: m.id } });

      for (let i = 0; i < winners.length; i++) {
        const aWon = winners[i] === "A";
        const loserRounds = rand(4, 11);
        const roundsA = aWon ? 13 : loserRounds;
        const roundsB = aWon ? loserRounds : 13;
        const rounds = roundsA + roundsB;

        const agentsA = shuffle(AGENT_POOL).slice(0, 5);
        const agentsB = shuffle(AGENT_POOL).slice(0, 5);
        const rows: Row[] = [
          ...rosterA.map((r, idx) => baseRow(r.player.pseudo, r.playerId, "A", agentsA[idx], aWon, rounds, idx)),
          ...rosterB.map((r, idx) => baseRow(r.player.pseudo, r.playerId, "B", agentsB[idx], !aWon, rounds, idx)),
        ];
        distributeFirsts(rows, rounds);

        // Timeline : roundsA rounds gagnés par A, roundsB par B, mélangés, avec une raison.
        const timeline = shuffle([
          ...Array(roundsA).fill("A"),
          ...Array(roundsB).fill("B"),
        ]).map((w) => ({ w, o: OUTCOMES[rand(0, OUTCOMES.length - 1)] }));

        const map = await tx.matchMap.create({
          data: {
            matchId: m.id, mapName: mapNames[i], scoreA: roundsA, scoreB: roundsB,
            order: i, riotMatchId: `sim-${m.id}-${i}`, startedAt: new Date("2026-05-01T18:00:00Z"),
            // Durée réaliste : ~1m40-1m55 par round + un peu d'overhead (buy phases, pauses).
            durationSec: rounds * rand(95, 115) + rand(90, 240),
            roundTimeline: timeline,
          },
        });
        await tx.playerGameStat.createMany({ data: rows.map((r) => ({ matchMapId: map.id, ...r })) });
      }

      await tx.match.update({
        where: { id: m.id },
        data: { statsStatus: "MATCHED", statsFetchedAt: new Date() },
      });
    });
    done++;
  }

  console.log(`OK - scoreboards simulés (rating/KAST/FK-FD + timeline) sur ${done} match(s) du tournoi ${TID}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
