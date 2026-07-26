/**
 * Simulation de scoreboards (façon vlr.gg) sur les matchs terminés du tournoi
 * de démonstration « VCT 2026: EMEA Stage 1 » (vlr-emea-s1).
 *
 * Pour chaque match FINISHED avec un roster des deux côtés, on génère des cartes
 * (cohérentes avec le score de série BO3) et un scoreboard réaliste par joueur
 * (K/D/A/ACS/ADR/HS%, agents, léger avantage à l'équipe gagnante), puis on marque
 * le match `statsStatus = "MATCHED"`. Idempotent : on supprime les cartes existantes.
 *
 * Usage : npm run db:seed:scoreboards   (après npm run db:seed:dev / seed-vlr-emea)
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const TID = "vlr-emea-s1";

const MAP_POOL = ["Ascent", "Haven", "Bind", "Split", "Lotus", "Sunset", "Icebox", "Abyss", "Corrode"];
const AGENT_POOL = [
  "Jett", "Raze", "Phoenix", "Neon", "Yoru", // duelists
  "Omen", "Brimstone", "Astra", "Harbor", "Clove", // controllers
  "Sova", "Breach", "Skye", "KAY/O", "Fade", // initiators
  "Killjoy", "Cypher", "Chamber", "Sage", "Vyse", // sentinels
];

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Ordre des vainqueurs de cartes : les cartes du perdant d'abord, la dernière au vainqueur. */
function mapWinners(mapsA: number, mapsB: number): ("A" | "B")[] {
  const seriesWinner: "A" | "B" = mapsA > mapsB ? "A" : "B";
  const list: ("A" | "B")[] = [...Array(mapsA).fill("A"), ...Array(mapsB).fill("B")];
  // enlève un exemplaire du vainqueur, mélange le reste, puis remet le vainqueur en dernier
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
};

/** Stats d'un joueur pour une carte donnée (avantage léger au vainqueur, star player en tête). */
function playerLine(
  rosterPseudo: string,
  playerId: string,
  side: "A" | "B",
  agent: string,
  won: boolean,
  rounds: number,
  starTier: number // 0 = star, 4 = bottom
): Row {
  const boost = won ? 1.12 : 0.92;
  const star = 1.15 - starTier * 0.06; // 1.15 .. 0.91
  const acs = Math.round(rand(150, 270) * boost * star);
  const kills = Math.max(4, Math.round((acs / 12) + rand(-2, 3)));
  const deaths = Math.max(4, Math.round(rounds * (won ? rand(45, 62) : rand(55, 75)) / 100));
  const assists = rand(2, 9);
  const adr = Math.round(acs * (rand(55, 66) / 100));
  const hsPct = rand(14, 38);
  return { riotName: rosterPseudo, playerId, teamSide: side, agent, kills, deaths, assists, acs, adr, hsPct };
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
        select: { playerId: true, player: { select: { pseudo: true } } },
        take: 5,
      }),
      db.teamMembership.findMany({
        where: { teamId: m.teamBId, role: "JOUEUR", leaveDate: null },
        select: { playerId: true, player: { select: { pseudo: true } } },
        take: 5,
      }),
    ]);
    if (rosterA.length < 5 || rosterB.length < 5) continue;

    const mapsA = m.scoreA;
    const mapsB = m.scoreB;
    if (mapsA + mapsB === 0) continue;
    const winners = mapWinners(mapsA, mapsB);
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
          ...rosterA.map((r, idx) =>
            playerLine(r.player.pseudo, r.playerId, "A", agentsA[idx], aWon, rounds, idx)
          ),
          ...rosterB.map((r, idx) =>
            playerLine(r.player.pseudo, r.playerId, "B", agentsB[idx], !aWon, rounds, idx)
          ),
        ];

        const map = await tx.matchMap.create({
          data: {
            matchId: m.id,
            mapName: mapNames[i],
            scoreA: roundsA,
            scoreB: roundsB,
            order: i,
            riotMatchId: `sim-${m.id}-${i}`,
            startedAt: new Date(`2026-05-01T18:00:00Z`),
          },
        });
        await tx.playerGameStat.createMany({
          data: rows.map((r) => ({ matchMapId: map.id, ...r })),
        });
      }

      await tx.match.update({
        where: { id: m.id },
        data: { statsStatus: "MATCHED", statsFetchedAt: new Date() },
      });
    });
    done++;
  }

  console.log(`OK — scoreboards simulés sur ${done} match(s) terminé(s) du tournoi ${TID}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
