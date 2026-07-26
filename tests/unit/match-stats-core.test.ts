import { describe, it, expect } from "vitest";
import {
  countExpected, assignSides, computeDerivedStats, selectSeries,
} from "@/lib/match-stats-core";
import type { CustomMatch, CustomMatchPlayer } from "@/lib/henrikdev";

function player(puuid: string, teamId: string): CustomMatchPlayer {
  return {
    puuid, name: puuid, tag: "EUW", teamId, agent: "Jett",
    kills: 0, deaths: 0, assists: 0, score: 0,
    headshots: 0, bodyshots: 0, legshots: 0, damageMade: 0, firstKills: 0,
  };
}
function match(id: string, startedAt: string, puuidsRed: string[], puuidsBlue: string[]): CustomMatch {
  return {
    matchId: id, map: "Ascent", startedAt,
    teamRounds: { Red: 13, Blue: 9 },
    players: [...puuidsRed.map((p) => player(p, "Red")), ...puuidsBlue.map((p) => player(p, "Blue"))],
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
