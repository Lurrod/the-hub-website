import { describe, it, expect } from "vitest";
import {
  countExpected,
  assignSides,
  assignSidesFromCamp,
  assignSidesFromOutcome,
  computeDerivedStats,
  hasRiotStats,
  indexPlayerIdsByPuuid,
  selectSeries,
  seriesScore,
  computeImpact,
  computeRating,
  roundTimeline,
  attackingTeamByRound,
} from "@/lib/match-stats-core";
import type { CustomMatch, CustomMatchPlayer } from "@/lib/henrikdev";

function player(puuid: string, teamId: string): CustomMatchPlayer {
  return {
    puuid,
    name: puuid,
    tag: "EUW",
    teamId,
    agent: "Jett",
    kills: 0,
    deaths: 0,
    assists: 0,
    score: 0,
    headshots: 0,
    bodyshots: 0,
    legshots: 0,
    damageMade: 0,
  };
}
function match(
  id: string,
  startedAt: string,
  puuidsRed: string[],
  puuidsBlue: string[]
): CustomMatch {
  return {
    matchId: id,
    map: "Ascent",
    seasonId: null,
    startedAt,
    durationSec: 2400,
    teamRounds: { Red: 13, Blue: 9 },
    // Pas de roster Premier : ces cas de test portent sur des parties
    // personnalisées, où le rattachement des camps se fait par les joueurs.
    teams: [
      { teamId: "Red", won: true, rosterId: null, roundsWon: 13, roundsLost: 9 },
      { teamId: "Blue", won: false, rosterId: null, roundsWon: 9, roundsLost: 13 },
    ],
    players: [
      ...puuidsRed.map((p) => player(p, "Red")),
      ...puuidsBlue.map((p) => player(p, "Blue")),
    ],
    rounds: [],
    kills: [],
  };
}

const red = ["a", "b", "c", "d", "e"];
const blue = ["f", "g", "h", "i", "j"];
const expected = new Set([...red, ...blue]);

describe("countExpected", () => {
  it("compte les puuid attendus présents", () => {
    expect(countExpected(match("m", "t", red, blue), expected)).toBe(10);
    expect(countExpected(match("m", "t", red, ["f", "g", "h", "x", "y"]), expected)).toBe(8);
  });
});

describe("assignSides", () => {
  it("associe le côté Riot majoritaire A/B et les rounds", () => {
    const puuidToSide = new Map<string, "A" | "B">([
      ...red.map((p) => [p, "A"] as const),
      ...blue.map((p) => [p, "B"] as const),
    ]);
    const r = assignSides(match("m", "t", red, blue), puuidToSide);
    expect(r.sideOfTeam.Red).toBe("A");
    expect(r.sideOfTeam.Blue).toBe("B");
    expect(r.roundsA).toBe(13);
    expect(r.roundsB).toBe(9);
  });
});

describe("computeDerivedStats", () => {
  it("calcule ACS/ADR/HS%", () => {
    const p = {
      ...player("a", "Red"),
      score: 4400,
      damageMade: 3300,
      headshots: 30,
      bodyshots: 60,
      legshots: 10,
    };
    const s = computeDerivedStats(p, 22);
    expect(s.acs).toBe(200);
    expect(s.adr).toBe(150);
    expect(s.hsPct).toBe(30);
  });
  it("gère la division par zéro", () => {
    const s = computeDerivedStats(player("a", "Red"), 0);
    expect(s).toEqual({ acs: 0, adr: 0, hsPct: 0 });
  });
});

describe("selectSeries", () => {
  it("filtre >=8, trie par date, plafonne à bestOf", () => {
    const m1 = match("m1", "2026-07-27T20:30:00Z", red, blue);
    const m2 = match("m2", "2026-07-27T20:00:00Z", red, blue);
    const m3 = match("m3", "2026-07-27T21:00:00Z", red, ["f", "x", "y", "z", "w"]);
    const out = selectSeries([m1, m2, m3], expected, 8, 3);
    expect(out.map((m) => m.matchId)).toEqual(["m2", "m1"]);
  });
});

describe("assignSidesFromCamp", () => {
  it("attribue A au camp choisi par l'admin", () => {
    const m = match("m", "t", red, blue);
    const out = assignSidesFromCamp(m, "Blue");
    expect(out.sideOfTeam).toEqual({ Red: "B", Blue: "A" });
    expect(out.roundsA).toBe(9);
    expect(out.roundsB).toBe(13);
  });
  it("inverse quand l'admin dit que l'équipe A est Red", () => {
    const out = assignSidesFromCamp(match("m", "t", red, blue), "Red");
    expect(out.sideOfTeam).toEqual({ Red: "A", Blue: "B" });
    expect(out.roundsA).toBe(13);
    expect(out.roundsB).toBe(9);
  });
  it("ignore la casse du camp saisi", () => {
    expect(assignSidesFromCamp(match("m", "t", red, blue), "blue").roundsA).toBe(9);
  });
  it("ne dépend pas des puuid liés", () => {
    const m = { ...match("m", "t", red, blue), players: [] };
    expect(assignSidesFromCamp(m, "Red").roundsA).toBe(13);
  });
});

describe("hasRiotStats", () => {
  it("vrai pour une série trouvée automatiquement ou importée à la main", () => {
    expect(hasRiotStats("MATCHED")).toBe(true);
    expect(hasRiotStats("MANUAL")).toBe(true);
  });
  it("faux sans récupération aboutie", () => {
    expect(hasRiotStats("NOT_FOUND")).toBe(false);
    expect(hasRiotStats(null)).toBe(false);
  });
});

describe("indexPlayerIdsByPuuid", () => {
  it("indexe les fiches par puuid", () => {
    const idx = indexPlayerIdsByPuuid([
      { id: "p1", puuid: "aaa" },
      { id: "p2", puuid: "bbb" },
    ]);
    expect(idx.get("aaa")).toBe("p1");
    expect(idx.get("bbb")).toBe("p2");
    expect(idx.size).toBe(2);
  });
  it("ignore les fiches sans compte Riot lié", () => {
    const idx = indexPlayerIdsByPuuid([
      { id: "p1", puuid: null },
      { id: "p2", puuid: "" },
      { id: "p3", puuid: "ccc" },
    ]);
    expect(idx.size).toBe(1);
    expect(idx.get("ccc")).toBe("p3");
  });
  it("renvoie un index vide sans fiche", () => {
    expect(indexPlayerIdsByPuuid([]).size).toBe(0);
  });
});

describe("seriesScore", () => {
  it("compte une map gagnée comme un point", () => {
    expect(
      seriesScore([
        { scoreA: 13, scoreB: 9 },
        { scoreA: 7, scoreB: 13 },
      ])
    ).toEqual({
      scoreA: 1,
      scoreB: 1,
    });
  });
  it("retombe à 0-0 quand toutes les maps sont retirées", () => {
    expect(seriesScore([])).toEqual({ scoreA: 0, scoreB: 0 });
  });
  it("ne donne de point à personne sur une map nulle", () => {
    expect(seriesScore([{ scoreA: 12, scoreB: 12 }])).toEqual({ scoreA: 0, scoreB: 0 });
  });
  it("recalcule bien après retrait d'une map d'une série 1-1", () => {
    const maps = [
      { scoreA: 13, scoreB: 9 },
      { scoreA: 7, scoreB: 13 },
    ];
    expect(seriesScore(maps.slice(0, 1))).toEqual({ scoreA: 1, scoreB: 0 });
  });
});

function kill(round: number, t: number, killer: string, victim: string, assists: string[] = []) {
  return {
    round,
    timeInRoundMs: t,
    killerPuuid: killer,
    victimPuuid: victim,
    assistantPuuids: assists,
    weapon: null,
  };
}

describe("computeImpact", () => {
  it("attribue first kill et first death au premier duel du round", () => {
    const i = computeImpact(
      [kill(0, 8000, "a", "f"), kill(0, 3000, "b", "g")],
      ["a", "b", "f", "g"],
      1
    );
    expect(i.get("b")!.firstKills).toBe(1);
    expect(i.get("g")!.firstDeaths).toBe(1);
    expect(i.get("a")!.firstKills).toBe(0);
    expect(i.get("f")!.firstDeaths).toBe(0);
  });

  it("compte le round pour qui tue, assiste ou survit", () => {
    const i = computeImpact([kill(0, 5000, "a", "f", ["b"])], ["a", "b", "c", "f"], 1);
    expect(i.get("a")!.kastRounds).toBe(1); // kill
    expect(i.get("b")!.kastRounds).toBe(1); // assist
    expect(i.get("c")!.kastRounds).toBe(1); // survie
    expect(i.get("f")!.kastRounds).toBe(0); // mort, sans trade
  });

  it("compte le round pour un joueur vengé dans la fenêtre de trade", () => {
    const i = computeImpact([kill(0, 5000, "a", "f"), kill(0, 7500, "g", "a")], ["a", "f", "g"], 1);
    expect(i.get("f")!.kastRounds).toBe(1); // tué à 5 s, vengé à 7.5 s
  });

  it("ne compte pas un joueur vengé trop tard", () => {
    const i = computeImpact([kill(0, 5000, "a", "f"), kill(0, 9000, "g", "a")], ["a", "f", "g"], 1);
    expect(i.get("f")!.kastRounds).toBe(0); // 4 s > fenêtre de 3 s
  });

  it("ignore les duels de joueurs hors partie et le cas sans round", () => {
    const i = computeImpact([kill(0, 1000, "inconnu", "a")], ["a"], 0);
    expect(i.get("a")!.kastRounds).toBe(0);
    expect(i.size).toBe(1);
  });
});

describe("computeRating", () => {
  it("place une performance moyenne autour de 1.00", () => {
    const r = computeRating({
      rounds: 20,
      kills: 15,
      deaths: 15,
      assists: 4,
      kastPct: 72,
      adr: 140,
    });
    expect(r).toBeGreaterThan(0.85);
    expect(r).toBeLessThan(1.15);
  });
  it("monte sur un gros match et descend sur un mauvais", () => {
    const bon = computeRating({
      rounds: 20,
      kills: 25,
      deaths: 10,
      assists: 6,
      kastPct: 85,
      adr: 200,
    });
    const mauvais = computeRating({
      rounds: 20,
      kills: 7,
      deaths: 18,
      assists: 2,
      kastPct: 55,
      adr: 80,
    });
    expect(bon).toBeGreaterThan(1.3);
    expect(mauvais).toBeLessThan(0.8);
  });
  it("ne descend jamais à zéro ni en négatif", () => {
    expect(
      computeRating({ rounds: 20, kills: 0, deaths: 20, assists: 0, kastPct: 0, adr: 0 })
    ).toBe(0.01);
  });
  it("renvoie 0 sans round joué", () => {
    expect(
      computeRating({ rounds: 0, kills: 5, deaths: 2, assists: 1, kastPct: 70, adr: 150 })
    ).toBe(0);
  });
});

describe("roundTimeline", () => {
  it("ramène le vainqueur de chaque round au côté A/B", () => {
    const t = roundTimeline(
      [
        { winningTeamId: "Red", outcome: "elim", plantedByTeamId: null, loadoutByTeam: {} },
        { winningTeamId: "Blue", outcome: "defuse", plantedByTeamId: null, loadoutByTeam: {} },
      ],
      { Red: "A", Blue: "B" }
    );
    expect(t).toEqual([
      { w: "A", o: "elim" },
      { w: "B", o: "defuse" },
    ]);
  });
  it("écarte un round dont le camp vainqueur est inconnu", () => {
    const t = roundTimeline(
      [{ winningTeamId: "", outcome: "elim", plantedByTeamId: null, loadoutByTeam: {} }],
      { Red: "A", Blue: "B" }
    );
    expect(t).toEqual([]);
  });
});

function rnd(win: string, planted: string | null) {
  return {
    winningTeamId: win,
    outcome: "elim" as const,
    plantedByTeamId: planted,
    loadoutByTeam: {},
  };
}

describe("attackingTeamByRound", () => {
  it("étend l'attaquant constaté aux rounds sans pose de la même mi-temps", () => {
    const rounds = [rnd("Red", "Red"), rnd("Blue", null), rnd("Red", null)];
    expect(attackingTeamByRound(rounds)).toEqual(["Red", "Red", "Red"]);
  });

  it("inverse les camps au round 12", () => {
    const rounds = [...Array.from({ length: 12 }, () => rnd("Red", "Red")), rnd("Blue", "Blue")];
    const out = attackingTeamByRound(rounds);
    expect(out[11]).toBe("Red");
    expect(out[12]).toBe("Blue");
  });

  it("déduit une mi-temps entièrement sans pose depuis la précédente", () => {
    const rounds = [
      ...Array.from({ length: 12 }, () => rnd("Red", "Red")),
      ...Array.from({ length: 3 }, () => rnd("Blue", null)),
    ];
    const out = attackingTeamByRound(rounds);
    expect(out[12]).toBe("Blue"); // camps inversés, deduit sans aucune pose
  });

  it("renvoie null quand aucune pose n'a eu lieu de tout le match", () => {
    expect(attackingTeamByRound([rnd("Red", null), rnd("Blue", null)])).toEqual([null, null]);
  });

  it("inverse les camps à CHAQUE round de prolongation", () => {
    // 24 rounds réglementaires (Red attaque, puis Blue), puis 4 rounds de
    // prolongation : chaque prolongation Valorant vaut deux rounds, un par
    // camp, donc les côtés s'échangent à chaque round.
    const rounds = [
      ...Array.from({ length: 12 }, () => rnd("Red", "Red")),
      ...Array.from({ length: 12 }, () => rnd("Blue", "Blue")),
      ...Array.from({ length: 4 }, () => rnd("Red", null)),
    ];
    const out = attackingTeamByRound(rounds);
    expect(out.slice(24)).toEqual(["Red", "Blue", "Red", "Blue"]);
  });

  it("respecte la pose constatée en prolongation plutôt que la déduction", () => {
    const rounds = [
      ...Array.from({ length: 12 }, () => rnd("Red", "Red")),
      ...Array.from({ length: 12 }, () => rnd("Blue", "Blue")),
      rnd("Red", "Blue"),
      rnd("Blue", null),
    ];
    const out = attackingTeamByRound(rounds);
    expect(out[24]).toBe("Blue");
    expect(out[25]).toBe("Red");
  });
});

describe("roundTimeline enrichie", () => {
  it("porte le camp attaquant et l'équipement de chaque côté", () => {
    const rounds = [
      {
        winningTeamId: "Red",
        outcome: "elim" as const,
        plantedByTeamId: "Red",
        loadoutByTeam: { Red: 20000, Blue: 4000 },
      },
    ];
    expect(roundTimeline(rounds, { Red: "A", Blue: "B" })).toEqual([
      { w: "A", o: "elim", s: "A", ea: 20000, eb: 4000 },
    ]);
  });
  it("omet les champs optionnels quand la donnée manque", () => {
    const rounds = [
      { winningTeamId: "Red", outcome: "elim" as const, plantedByTeamId: null, loadoutByTeam: {} },
    ];
    expect(roundTimeline(rounds, { Red: "A", Blue: "B" })).toEqual([{ w: "A", o: "elim" }]);
  });
});

describe("selectSeries : fenêtre autour de la date du match", () => {
  const DATE = new Date("2026-07-27T00:00:00Z"); // date d'un <input type="date">

  it("garde les parties jouées le soir du match", () => {
    const m = match("m", "2026-07-27T20:30:00Z", red, blue);
    expect(selectSeries([m], expected, 8, 3, DATE).map((x) => x.matchId)).toEqual(["m"]);
  });

  it("garde une partie qui déborde sur la nuit suivante", () => {
    const m = match("m", "2026-07-28T00:45:00Z", red, blue);
    expect(selectSeries([m], expected, 8, 3, DATE)).toHaveLength(1);
  });

  it("écarte les scrims de la veille et du surlendemain", () => {
    const veille = match("v", "2026-07-25T20:00:00Z", red, blue);
    const apres = match("a", "2026-07-29T20:00:00Z", red, blue);
    expect(selectSeries([veille, apres], expected, 8, 3, DATE)).toEqual([]);
  });

  it("écarte une partie sans horodatage quand une date est fournie", () => {
    const m = match("m", "", red, blue);
    expect(selectSeries([m], expected, 8, 3, DATE)).toEqual([]);
  });

  it("sans date de match, la borne est désactivée", () => {
    // Mieux vaut un import approximatif que pas d'import du tout.
    const vieux = match("m", "2020-01-01T20:00:00Z", red, blue);
    expect(selectSeries([vieux], expected, 8, 3, null)).toHaveLength(1);
  });

  it("au-delà du plafond, retient les parties les plus récentes", () => {
    // Échauffements et scrims précèdent le match officiel.
    const scrim = match("scrim", "2026-07-27T18:00:00Z", red, blue);
    const map1 = match("map1", "2026-07-27T20:00:00Z", red, blue);
    const map2 = match("map2", "2026-07-27T21:00:00Z", red, blue);
    const out = selectSeries([scrim, map1, map2], expected, 8, 2, DATE);
    expect(out.map((m) => m.matchId)).toEqual(["map1", "map2"]);
  });
});

describe("assignSidesFromOutcome", () => {
  it("attribue A au camp vainqueur quand l'admin dit que l'équipe A a gagné", () => {
    // teamRounds: Red 13 - Blue 9 → le vainqueur est Red.
    const out = assignSidesFromOutcome(match("m", "t", red, blue), true);
    expect(out?.sideOfTeam).toEqual({ Red: "A", Blue: "B" });
    expect(out?.roundsA).toBe(13);
    expect(out?.roundsB).toBe(9);
  });

  it("attribue A au camp perdant quand l'admin dit que l'équipe A a perdu", () => {
    const out = assignSidesFromOutcome(match("m", "t", red, blue), false);
    expect(out?.sideOfTeam).toEqual({ Red: "B", Blue: "A" });
    expect(out?.roundsA).toBe(9);
    expect(out?.roundsB).toBe(13);
  });

  it("refuse une map sans vainqueur : l'énoncé « a gagné » n'y départage rien", () => {
    const m = { ...match("m", "t", red, blue), teamRounds: { Red: 12, Blue: 12 } };
    expect(assignSidesFromOutcome(m, true)).toBeNull();
  });

  it("ne dépend pas des puuid liés", () => {
    const m = { ...match("m", "t", red, blue), players: [] };
    expect(assignSidesFromOutcome(m, true)?.roundsA).toBe(13);
  });
});
