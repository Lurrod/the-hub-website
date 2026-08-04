import { describe, it, expect } from "vitest";
import {
  countExpected, assignSides, assignSidesFromCamp, computeDerivedStats, hasRiotStats,
  indexPlayerIdsByPuuid, selectSeries, seriesScore, computeImpact, computeRating, roundTimeline,
} from "@/lib/match-stats-core";
import type { CustomMatch, CustomMatchPlayer } from "@/lib/henrikdev";

function player(puuid: string, teamId: string): CustomMatchPlayer {
  return {
    puuid, name: puuid, tag: "EUW", teamId, agent: "Jett",
    kills: 0, deaths: 0, assists: 0, score: 0,
    headshots: 0, bodyshots: 0, legshots: 0, damageMade: 0,
  };
}
function match(id: string, startedAt: string, puuidsRed: string[], puuidsBlue: string[]): CustomMatch {
  return {
    matchId: id, map: "Ascent", startedAt, durationSec: 2400,
    teamRounds: { Red: 13, Blue: 9 },
    players: [...puuidsRed.map((p) => player(p, "Red")), ...puuidsBlue.map((p) => player(p, "Blue"))],
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
    const p = { ...player("a", "Red"), score: 4400, damageMade: 3300, headshots: 30, bodyshots: 60, legshots: 10 };
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
    expect(seriesScore([{ scoreA: 13, scoreB: 9 }, { scoreA: 7, scoreB: 13 }])).toEqual({
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
    const maps = [{ scoreA: 13, scoreB: 9 }, { scoreA: 7, scoreB: 13 }];
    expect(seriesScore(maps.slice(0, 1))).toEqual({ scoreA: 1, scoreB: 0 });
  });
});

function kill(round: number, t: number, killer: string, victim: string, assists: string[] = []) {
  return { round, timeInRoundMs: t, killerPuuid: killer, victimPuuid: victim, assistantPuuids: assists };
}

describe("computeImpact", () => {
  it("attribue first kill et first death au premier duel du round", () => {
    const i = computeImpact([kill(0, 8000, "a", "f"), kill(0, 3000, "b", "g")], ["a", "b", "f", "g"], 1);
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
    const r = computeRating({ rounds: 20, kills: 15, deaths: 15, assists: 4, kastPct: 72, adr: 140 });
    expect(r).toBeGreaterThan(0.85);
    expect(r).toBeLessThan(1.15);
  });
  it("monte sur un gros match et descend sur un mauvais", () => {
    const bon = computeRating({ rounds: 20, kills: 25, deaths: 10, assists: 6, kastPct: 85, adr: 200 });
    const mauvais = computeRating({ rounds: 20, kills: 7, deaths: 18, assists: 2, kastPct: 55, adr: 80 });
    expect(bon).toBeGreaterThan(1.3);
    expect(mauvais).toBeLessThan(0.8);
  });
  it("ne descend jamais à zéro ni en négatif", () => {
    expect(computeRating({ rounds: 20, kills: 0, deaths: 20, assists: 0, kastPct: 0, adr: 0 })).toBe(0.01);
  });
  it("renvoie 0 sans round joué", () => {
    expect(computeRating({ rounds: 0, kills: 5, deaths: 2, assists: 1, kastPct: 70, adr: 150 })).toBe(0);
  });
});

describe("roundTimeline", () => {
  it("ramène le vainqueur de chaque round au côté A/B", () => {
    const t = roundTimeline(
      [
        { winningTeamId: "Red", outcome: "elim" },
        { winningTeamId: "Blue", outcome: "defuse" },
      ],
      { Red: "A", Blue: "B" }
    );
    expect(t).toEqual([{ w: "A", o: "elim" }, { w: "B", o: "defuse" }]);
  });
  it("écarte un round dont le camp vainqueur est inconnu", () => {
    const t = roundTimeline([{ winningTeamId: "", outcome: "elim" }], { Red: "A", Blue: "B" });
    expect(t).toEqual([]);
  });
});
