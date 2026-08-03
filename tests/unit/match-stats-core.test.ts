import { describe, it, expect } from "vitest";
import {
  countExpected, assignSides, assignSidesFromCamp, computeDerivedStats, hasRiotStats,
  indexPlayerIdsByPuuid, selectSeries,
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
    matchId: id, map: "Ascent", startedAt, durationSec: 2400,
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
