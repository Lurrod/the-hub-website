import { describe, it, expect } from "vitest";
import {
  agentShares,
  bestGame,
  buildPlayerOverview,
  mapRecords,
  ratingTrend,
  type PlayerStatRow,
} from "@/lib/player-overview-core";

function row(over: Partial<PlayerStatRow> = {}): PlayerStatRow {
  return {
    matchId: "m1",
    mapName: "Ascent",
    date: null,
    agent: "Jett",
    kills: 15,
    deaths: 15,
    assists: 4,
    acs: 210,
    adr: 140,
    hsPct: 25,
    kast: 72,
    rating: 1,
    firstKills: 2,
    firstDeaths: 2,
    win: true,
    opponentTag: "OPP",
    ...over,
  };
}

describe("agentShares", () => {
  it("classe les agents du plus joué au moins joué avec leur part", () => {
    const out = agentShares([
      row({ agent: "Jett" }),
      row({ agent: "Jett" }),
      row({ agent: "Raze" }),
      row({ agent: "Sova" }),
    ]);
    expect(out[0]).toEqual({ agent: "Jett", maps: 2, pct: 50 });
    expect(out).toHaveLength(3);
  });
  it("ignore les cartes sans agent renseigné", () => {
    const out = agentShares([row({ agent: "Jett" }), row({ agent: null })]);
    expect(out).toEqual([{ agent: "Jett", maps: 1, pct: 100 }]);
  });
  it("départage à égalité par ordre alphabétique", () => {
    const out = agentShares([row({ agent: "Sova" }), row({ agent: "Jett" })]);
    expect(out.map((a) => a.agent)).toEqual(["Jett", "Sova"]);
  });
});

describe("mapRecords", () => {
  it("agrège victoires et cartes jouées par map", () => {
    const out = mapRecords([
      row({ mapName: "Ascent", win: true }),
      row({ mapName: "Ascent", win: false }),
      row({ mapName: "Bind", win: true }),
    ]);
    expect(out[0]).toEqual({ mapName: "Ascent", maps: 2, wins: 1, winratePct: 50 });
    expect(out[1]).toEqual({ mapName: "Bind", maps: 1, wins: 1, winratePct: 100 });
  });
});

describe("bestGame", () => {
  it("retient la carte au plus grand nombre de kills", () => {
    const out = bestGame([row({ kills: 12 }), row({ kills: 30, mapName: "Split" }), row({ kills: 9 })]);
    expect(out).toMatchObject({ kills: 30, mapName: "Split" });
  });
  it("départage une égalité de kills par le rating", () => {
    const out = bestGame([
      row({ kills: 25, rating: 1.1, mapName: "Ascent" }),
      row({ kills: 25, rating: 1.4, mapName: "Lotus" }),
    ]);
    expect(out!.mapName).toBe("Lotus");
  });
  it("renvoie null sans aucune carte", () => {
    expect(bestGame([])).toBeNull();
  });
});

describe("ratingTrend", () => {
  it("remet les cartes dans l'ordre chronologique et plafonne la série", () => {
    const rows = [
      row({ rating: 3, mapName: "recent" }),
      row({ rating: 2, mapName: "milieu" }),
      row({ rating: 1, mapName: "ancien" }),
    ];
    const out = ratingTrend(rows, 2);
    expect(out.map((p) => p.rating)).toEqual([2, 3]);
  });
});

describe("buildPlayerOverview", () => {
  it("calcule le K/D sur les totaux, pas sur la moyenne des cartes", () => {
    const o = buildPlayerOverview([
      row({ kills: 20, deaths: 10 }),
      row({ kills: 10, deaths: 10 }),
    ]);
    expect(o.kills).toBe(30);
    expect(o.deaths).toBe(20);
    expect(o.kd).toBe(1.5);
  });
  it("ne divise pas par zéro quand le joueur n'est jamais mort", () => {
    const o = buildPlayerOverview([row({ kills: 7, deaths: 0 })]);
    expect(o.kd).toBe(7);
    expect(Number.isFinite(o.kd)).toBe(true);
  });
  it("totalise les duels d'entrée et moyenne les pourcentages", () => {
    const o = buildPlayerOverview([
      row({ firstKills: 3, firstDeaths: 1, kast: 80, hsPct: 30 }),
      row({ firstKills: 1, firstDeaths: 3, kast: 60, hsPct: 20 }),
    ]);
    expect(o.firstKills).toBe(4);
    expect(o.firstDeaths).toBe(4);
    expect(o.avgKast).toBe(70);
    expect(o.avgHs).toBe(25);
  });
  it("reste neutre sur un joueur sans aucune carte", () => {
    const o = buildPlayerOverview([]);
    expect(o).toMatchObject({ maps: 0, kd: 0, topAgent: null, bestGame: null, avgRating: 0 });
    expect(o.agents).toEqual([]);
    expect(o.trend).toEqual([]);
  });
  it("plafonne la liste d'agents à six entrées", () => {
    const many = ["a", "b", "c", "d", "e", "f", "g", "h"].map((agent) => row({ agent }));
    expect(buildPlayerOverview(many).agents).toHaveLength(6);
  });
});

describe("agentsOther", () => {
  it("agrège les agents au-delà du sixième pour que le disque fasse 100 %", () => {
    const many = ["a", "b", "c", "d", "e", "f", "g", "h"].map((agent) => row({ agent }));
    const o = buildPlayerOverview(many);
    expect(o.agents).toHaveLength(6);
    expect(o.agentsOther).toMatchObject({ agent: "Autres", maps: 2 });
    const total = o.agents.reduce((n, a) => n + a.maps, 0) + o.agentsOther!.maps;
    expect(total).toBe(8);
  });
  it("reste nul quand le joueur tient dans six agents", () => {
    const few = ["a", "b", "c"].map((agent) => row({ agent }));
    expect(buildPlayerOverview(few).agentsOther).toBeNull();
  });
});
