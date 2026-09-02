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
import { computeRating } from "../src/lib/match-stats-core";

const db = new PrismaClient();
const TID = "vlr-emea-s1";

const MAP_POOL = [
  "Ascent",
  "Haven",
  "Bind",
  "Split",
  "Lotus",
  "Sunset",
  "Icebox",
  "Abyss",
  "Corrode",
];
const AGENT_POOL = [
  "Jett",
  "Raze",
  "Phoenix",
  "Neon",
  "Yoru",
  "Omen",
  "Brimstone",
  "Astra",
  "Harbor",
  "Clove",
  "Sova",
  "Breach",
  "Skye",
  "KAY/O",
  "Fade",
  "Killjoy",
  "Cypher",
  "Chamber",
  "Sage",
  "Vyse",
];
const OUTCOMES = [
  "elim",
  "elim",
  "elim",
  "elim",
  "elim",
  "detonate",
  "detonate",
  "defuse",
  "time",
] as const;

// Agents par rôle : un joueur tourne dans le vivier de son rôle, avec un main
// qui revient souvent. Sans ça, ses « agents les plus joués » seraient aléatoires
// et contrediraient le rôle affiché sur sa carte.
const AGENTS_BY_ROLE: Record<string, string[]> = {
  DUELIST: ["Jett", "Raze", "Phoenix", "Neon", "Yoru", "Iso"],
  CONTROLLER: ["Omen", "Brimstone", "Astra", "Harbor", "Clove", "Viper"],
  INITIATOR: ["Sova", "Breach", "Skye", "KAY/O", "Fade", "Gekko", "Tejo"],
  SENTINEL: ["Killjoy", "Cypher", "Chamber", "Sage", "Vyse", "Deadlock"],
};

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

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
  starTier: number
): Row {
  const boost = won ? 1.12 : 0.92;
  const star = 1.15 - starTier * 0.06;
  const acs = Math.round(rand(150, 270) * boost * star);
  const assists = rand(2, 9);
  const adr = Math.round(acs * (rand(55, 66) / 100));
  const hsPct = rand(14, 38);
  const kast = clamp(Math.round((won ? 74 : 66) + rand(-8, 12)), 45, 95);
  // kills et deaths sont posés plus tard par balanceDuels() : dans un match
  // fermé, les kills d'un camp SONT les morts de l'autre. Les tirer chacun de
  // leur côté donnait un tournoi où plus personne n'avait un K/D sous 1.
  return {
    riotName: pseudo,
    playerId,
    teamSide: side,
    agent,
    kills: 0,
    deaths: 0,
    assists,
    acs,
    adr,
    hsPct,
    kast,
    rating: 0,
    firstKills: 0,
    firstDeaths: 0,
  };
}

/**
 * Répartit kills et morts sur une carte en respectant la seule contrainte qui
 * ne se négocie pas : les kills d'un camp sont les morts de l'autre.
 *
 * Le volume total suit le nombre de rounds (~3.6 kills par round pour le
 * vainqueur, ~3.0 pour le perdant), et la répartition interne suit l'ACS déjà
 * tiré, pour que la meilleure carte du scoreboard reste le meilleur fragger.
 * Le rating est recalculé ensuite, une fois les vrais chiffres connus.
 */
function balanceDuels(rows: Row[], rounds: number, aWon: boolean) {
  const sides = ["A", "B"] as const;
  const teamKills: Record<"A" | "B", number> = {
    A: Math.round(rounds * (aWon ? 3.6 : 3.0)),
    B: Math.round(rounds * (aWon ? 3.0 : 3.6)),
  };

  /** Répartit `total` sur les joueurs d'un camp, au prorata de `weightOf`. */
  const spread = (side: "A" | "B", total: number, weightOf: (r: Row) => number) => {
    const team = rows.filter((r) => r.teamSide === side);
    const sum = team.reduce((n, r) => n + weightOf(r), 0);
    const parts = team.map((r) => Math.max(2, Math.round((weightOf(r) / sum) * total)));
    // L'arrondi fait dériver la somme : on recale sur le joueur le plus exposé.
    const drift = total - parts.reduce((n, v) => n + v, 0);
    parts[0] += drift;
    return { team, parts };
  };

  for (const side of sides) {
    const opp = side === "A" ? "B" : "A";
    const k = spread(side, teamKills[side], (r) => r.acs);
    k.team.forEach((r, i) => (r.kills = Math.max(2, k.parts[i])));
    // Les meilleurs joueurs meurent moins : on inverse le poids de l'ACS.
    const d = spread(side, teamKills[opp], (r) => 1 / Math.max(1, r.acs));
    d.team.forEach((r, i) => (r.deaths = Math.max(2, d.parts[i])));
  }

  for (const r of rows) {
    r.rating = computeRating({
      rounds,
      kills: r.kills,
      deaths: r.deaths,
      assists: r.assists,
      kastPct: r.kast,
      adr: r.adr,
    });
  }
}

/** Somme des codes de caractères : sert à donner un main stable à chaque joueur. */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Agents d'un roster sur une carte : chacun dans son rôle, sans doublon d'équipe. */
function pickAgents(roster: { playerId: string; valorantRole: string | null }[]): string[] {
  const used = new Set<string>();
  return roster.map((p) => {
    const pool = (p.valorantRole && AGENTS_BY_ROLE[p.valorantRole]) || AGENT_POOL;
    const main = pool[hash(p.playerId) % pool.length];
    const free = pool.filter((a) => !used.has(a));
    const fallback = AGENT_POOL.filter((a) => !used.has(a));
    // 55 % du temps sur son main, sinon un autre agent de son rôle.
    const agent =
      !used.has(main) && Math.random() < 0.55
        ? main
        : (free.length ? shuffle(free) : shuffle(fallback))[0];
    used.add(agent);
    return agent;
  });
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
        select: { playerId: true, player: { select: { pseudo: true, valorantRole: true } } },
        take: 5,
      }),
      db.teamMembership.findMany({
        where: { teamId: m.teamBId, role: "JOUEUR", leaveDate: null },
        select: { playerId: true, player: { select: { pseudo: true, valorantRole: true } } },
        take: 5,
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

        const agentsA = pickAgents(
          rosterA.map((r) => ({ playerId: r.playerId, valorantRole: r.player.valorantRole }))
        );
        const agentsB = pickAgents(
          rosterB.map((r) => ({ playerId: r.playerId, valorantRole: r.player.valorantRole }))
        );
        const rows: Row[] = [
          ...rosterA.map((r, idx) =>
            baseRow(r.player.pseudo, r.playerId, "A", agentsA[idx], aWon, idx)
          ),
          ...rosterB.map((r, idx) =>
            baseRow(r.player.pseudo, r.playerId, "B", agentsB[idx], !aWon, idx)
          ),
        ];
        balanceDuels(rows, rounds, aWon);
        distributeFirsts(rows, rounds);

        // Timeline : roundsA rounds gagnés par A, roundsB par B, mélangés, avec
        // une raison, le camp attaquant et l'équipement des deux côtés.
        //
        // Les camps s'inversent au round 12, comme en jeu. L'économie suit une
        // règle simple mais crédible : pistolet à 2 400, achat complet après une
        // victoire, et rechargement à vide après deux défaites d'affilée —
        // c'est ce qui produit de vrais rounds « eco » à analyser.
        const attackerFirstHalf: "A" | "B" = Math.random() > 0.5 ? "A" : "B";
        const flip = (s: "A" | "B") => (s === "A" ? "B" : "A");
        const lossStreak: Record<"A" | "B", number> = { A: 0, B: 0 };
        const buy = (side: "A" | "B", roundIndex: number) => {
          if (roundIndex === 0 || roundIndex === 12) return 2400;
          if (lossStreak[side] >= 2) return rand(2900, 6200);
          if (lossStreak[side] === 1) return rand(9000, 15000);
          return rand(16500, 24000);
        };

        const timeline = shuffle([...Array(roundsA).fill("A"), ...Array(roundsB).fill("B")]).map(
          (w: "A" | "B", idx: number) => {
            const entry = {
              w,
              o: OUTCOMES[rand(0, OUTCOMES.length - 1)],
              s: idx < 12 ? attackerFirstHalf : flip(attackerFirstHalf),
              ea: buy("A", idx),
              eb: buy("B", idx),
            };
            lossStreak[w] = 0;
            lossStreak[flip(w)] += 1;
            return entry;
          }
        );

        const map = await tx.matchMap.create({
          data: {
            matchId: m.id,
            mapName: mapNames[i],
            scoreA: roundsA,
            scoreB: roundsB,
            order: i,
            riotMatchId: `sim-${m.id}-${i}`,
            startedAt: new Date("2026-05-01T18:00:00Z"),
            // Durée réaliste : ~1m40-1m55 par round + un peu d'overhead (buy phases, pauses).
            durationSec: rounds * rand(95, 115) + rand(90, 240),
            roundTimeline: timeline,
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

  console.log(
    `OK - scoreboards simulés (rating/KAST/FK-FD + timeline) sur ${done} match(s) du tournoi ${TID}.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
