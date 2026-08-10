import { describe, it, expect } from "vitest";
import {
  longestStreak,
  biggestComeback,
  buildTeamStats,
  type TeamMapEntry,
  type TeamMatchEntry,
  type TeamPlayerEntry,
  type TeamRound,
  type TeamIdentity,
} from "@/lib/tournament-teams-core";

const TEAM: TeamIdentity = { id: "t1", name: "Alpha", tag: "ALP", logo: null };

/** Round minimal : seul le résultat compte, le reste est neutre par défaut. */
function round(won: boolean, extra: Partial<TeamRound> = {}): TeamRound {
  return { won, outcome: "Elimination", attacking: null, loadout: null, oppLoadout: null, ...extra };
}

/** Carte dont le score se déduit des rounds, pour ne pas le saisir deux fois. */
function map(mapName: string, rounds: TeamRound[], extra: Partial<TeamMapEntry> = {}): TeamMapEntry {
  const roundsFor = rounds.filter((r) => r.won).length;
  return {
    teamId: TEAM.id,
    matchId: "m1",
    mapName,
    roundsFor,
    roundsAgainst: rounds.length - roundsFor,
    won: roundsFor > rounds.length - roundsFor,
    rounds,
    ...extra,
  };
}

function player(over: Partial<TeamPlayerEntry> = {}): TeamPlayerEntry {
  return {
    teamId: TEAM.id,
    playerId: "p1",
    name: "Neo",
    nationality: "FR",
    maps: 2,
    kills: 40,
    deaths: 30,
    assists: 10,
    acsSum: 500,
    ratingSum: 2.4,
    firstKills: 6,
    firstDeaths: 3,
    agents: ["Jett"],
    ...over,
  };
}

describe("longestStreak", () => {
  it("compte la plus longue suite de rounds gagnés", () => {
    const m = map("Ascent", [round(true), round(true), round(false), round(true), round(true), round(true)]);
    expect(longestStreak([m])).toBe(3);
  });

  it("ne fait pas enjamber deux cartes à une même série", () => {
    // Trois rounds gagnés en fin de carte 1 puis trois en début de carte 2 ne
    // font pas une série de six : la série s'arrête à la fin de la carte.
    const a = map("Ascent", [round(false), round(true), round(true), round(true)]);
    const b = map("Bind", [round(true), round(true), round(true), round(false)]);
    expect(longestStreak([a, b])).toBe(3);
  });

  it("rend 0 sans aucune carte", () => {
    expect(longestStreak([])).toBe(0);
  });

  it("rend 0 quand aucun round n'est gagné", () => {
    expect(longestStreak([map("Split", [round(false), round(false)])])).toBe(0);
  });
});

describe("biggestComeback", () => {
  it("mesure le pire écart traversé sur une carte finalement gagnée", () => {
    // 0-4 puis huit rounds gagnés : le retard maximal comblé vaut 4.
    const rounds = [
      ...Array.from({ length: 4 }, () => round(false)),
      ...Array.from({ length: 8 }, () => round(true)),
    ];
    expect(biggestComeback([map("Haven", rounds)])).toBe(4);
  });

  it("ignore les cartes perdues", () => {
    // Même retard, mais la carte est perdue : ce n'est pas une remontée.
    const rounds = [
      ...Array.from({ length: 5 }, () => round(false)),
      ...Array.from({ length: 3 }, () => round(true)),
    ];
    expect(biggestComeback([map("Lotus", rounds)])).toBe(0);
  });

  it("retient le plus gros retard parmi plusieurs cartes gagnées", () => {
    const petit = map("Bind", [round(false), round(true), round(true)]);
    const gros = map("Icebox", [round(false), round(false), round(false), round(true), round(true), round(true), round(true)]);
    expect(biggestComeback([petit, gros])).toBe(3);
  });

  it("rend 0 sur une carte menée de bout en bout", () => {
    expect(biggestComeback([map("Split", [round(true), round(true), round(false)])])).toBe(0);
  });
});

describe("buildTeamStats", () => {
  it("cumule matchs, cartes et rounds", () => {
    const matches: TeamMatchEntry[] = [
      { teamId: TEAM.id, matchId: "m1", won: true },
      { teamId: TEAM.id, matchId: "m2", won: false },
    ];
    const maps = [
      map("Ascent", [round(true), round(true), round(false)]),
      map("Bind", [round(false), round(false), round(true)]),
    ];
    const s = buildTeamStats(TEAM, matches, maps, [player()]);
    expect(s.matchesPlayed).toBe(2);
    expect(s.matchesWon).toBe(1);
    expect(s.mapsPlayed).toBe(2);
    expect(s.mapsWon).toBe(1);
    expect(s.roundsFor).toBe(3);
    expect(s.roundsAgainst).toBe(3);
    expect(s.roundDiff).toBe(0);
    expect(s.form).toEqual([true, false]);
  });

  it("classe les cartes par nombre de parties puis par nom", () => {
    const maps = [
      map("Split", [round(true), round(true)]),
      map("Ascent", [round(true), round(false)]),
      map("Ascent", [round(true), round(true)]),
      map("Bind", [round(false), round(false)]),
    ];
    const s = buildTeamStats(TEAM, [], maps, []);
    expect(s.maps.map((m) => m.mapName)).toEqual(["Ascent", "Bind", "Split"]);
    expect(s.maps[0]).toMatchObject({ played: 2, won: 1, winratePct: 50 });
  });

  it("sépare attaque et défense, et ignore les rounds sans camp connu", () => {
    // `attacking: null` vient des imports anciens : ces rounds ne doivent
    // gonfler ni le compteur d'attaque ni celui de défense.
    const maps = [
      map("Haven", [
        round(true, { attacking: true }),
        round(false, { attacking: true }),
        round(true, { attacking: false }),
        round(true, { attacking: null }),
      ]),
    ];
    const s = buildTeamStats(TEAM, [], maps, []);
    expect(s.attack).toEqual({ played: 2, won: 1, winratePct: 50 });
    expect(s.defense).toEqual({ played: 1, won: 1, winratePct: 100 });
  });

  it("ne compte comme pistolets que le premier round de chaque mi-temps", () => {
    const rounds = Array.from({ length: 14 }, (_, i) => round(i === 0 || i === 12));
    const s = buildTeamStats(TEAM, [], [map("Pearl", rounds)], []);
    expect(s.pistols).toEqual({ played: 2, won: 2, winratePct: 100 });
  });

  it("ne compte un eco qu'au-delà de 4000 d'écart d'équipement", () => {
    const maps = [
      map("Abyss", [
        round(true, { loadout: 1000, oppLoadout: 5000 }), // écart 4000 : eco gagné
        round(false, { loadout: 1000, oppLoadout: 6000 }), // eco perdu
        round(true, { loadout: 3000, oppLoadout: 6000 }), // écart 3000 : hors eco
        round(true, { loadout: null, oppLoadout: 6000 }), // donnée absente
      ]),
    ];
    const s = buildTeamStats(TEAM, [], maps, []);
    expect(s.ecoPlayed).toBe(2);
    expect(s.ecoWins).toBe(1);
  });

  it("ne compte les types de fin que sur les rounds gagnés", () => {
    const maps = [
      map("Sunset", [
        round(true, { outcome: "Defuse" }),
        round(true, { outcome: "Defuse" }),
        round(false, { outcome: "Detonate" }),
      ]),
    ];
    expect(buildTeamStats(TEAM, [], maps, []).outcomes).toEqual({ Defuse: 2 });
  });

  it("classe les joueurs par rating puis par éliminations", () => {
    const players = [
      player({ playerId: "p1", name: "Bas", maps: 1, ratingSum: 1, kills: 20 }),
      player({ playerId: "p2", name: "Haut", maps: 1, ratingSum: 1.5, kills: 10 }),
      player({ playerId: "p3", name: "Égal", maps: 1, ratingSum: 1, kills: 25 }),
    ];
    const s = buildTeamStats(TEAM, [], [], players);
    expect(s.players.map((p) => p.name)).toEqual(["Haut", "Égal", "Bas"]);
  });

  it("calcule la part d'éliminations de chaque joueur", () => {
    const players = [
      player({ playerId: "p1", kills: 30 }),
      player({ playerId: "p2", kills: 10 }),
    ];
    const s = buildTeamStats(TEAM, [], [], players);
    expect(s.players.map((p) => p.killShare)).toEqual([75, 25]);
  });

  it("agrège les agents joués et les classe par fréquence", () => {
    const players = [
      player({ playerId: "p1", agents: ["Jett", "Raze"] }),
      player({ playerId: "p2", agents: ["Jett"] }),
    ];
    const s = buildTeamStats(TEAM, [], [], players);
    expect(s.agents).toEqual([
      { agent: "Jett", maps: 2 },
      { agent: "Raze", maps: 1 },
    ]);
  });

  it("moyenne rating et ACS sur les cartes jouées par les joueurs", () => {
    const players = [
      player({ playerId: "p1", maps: 2, ratingSum: 2.4, acsSum: 500 }),
      player({ playerId: "p2", maps: 2, ratingSum: 2.0, acsSum: 400 }),
    ];
    const s = buildTeamStats(TEAM, [], [], players);
    expect(s.avgRating).toBe(1.1); // 4.4 / 4
    expect(s.avgAcs).toBe(225); // 900 / 4
  });

  it("rend des zéros plutôt que NaN sur une équipe sans aucune donnée", () => {
    // Une équipe inscrite mais qui n'a encore rien joué : la page doit
    // s'afficher, pas produire des NaN.
    const s = buildTeamStats(TEAM, [], [], []);
    expect(s).toMatchObject({
      matchesPlayed: 0,
      mapsPlayed: 0,
      avgRating: 0,
      avgAcs: 0,
      roundDiff: 0,
      longestStreak: 0,
      biggestComeback: 0,
    });
    expect(s.maps).toEqual([]);
    expect(s.agents).toEqual([]);
    expect(s.players).toEqual([]);
  });

  it("neutralise la part d'éliminations quand l'équipe n'en a aucune", () => {
    const s = buildTeamStats(TEAM, [], [], [player({ kills: 0, maps: 0, ratingSum: 0, acsSum: 0 })]);
    expect(s.players[0].killShare).toBe(0);
    expect(s.players[0].acs).toBe(0);
    expect(s.players[0].rating).toBe(0);
  });
});
