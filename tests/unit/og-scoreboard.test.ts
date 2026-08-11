import { describe, it, expect } from "vitest";
import { bySide, kdaLabel, mapRows, seriesRows, type RawStat } from "@/lib/og/scoreboard";

const stat = (over: Partial<RawStat> = {}): RawStat => ({
  playerId: "p1",
  pseudo: "Sh1n",
  riotName: "Sh1n#EUW",
  teamSide: "A",
  agent: "Jett",
  kills: 20,
  deaths: 10,
  assists: 5,
  acs: 250,
  rating: 1.2,
  ...over,
});

describe("mapRows", () => {
  it("classe les joueurs du meilleur rating au moins bon", () => {
    const rows = mapRows([
      stat({ playerId: "a", pseudo: "Alpha", rating: 0.9 }),
      stat({ playerId: "b", pseudo: "Bravo", rating: 1.4 }),
      stat({ playerId: "c", pseudo: "Charlie", rating: 1.1 }),
    ]);
    expect(rows.map((r) => r.name)).toEqual(["Bravo", "Charlie", "Alpha"]);
  });

  it("départage une égalité de rating par le nom, pour un ordre stable", () => {
    const rows = mapRows([
      stat({ playerId: "b", pseudo: "Bravo", rating: 1.2 }),
      stat({ playerId: "a", pseudo: "Alpha", rating: 1.2 }),
    ]);
    expect(rows.map((r) => r.name)).toEqual(["Alpha", "Bravo"]);
  });

  it("tombe sur le Riot ID sans son tag quand le joueur n'a pas de fiche", () => {
    const rows = mapRows([stat({ playerId: null, pseudo: null, riotName: "Nivera#0000" })]);
    expect(rows[0].name).toBe("Nivera");
  });

  it("normalise le camp : tout ce qui n'est pas « A » est le camp B", () => {
    const rows = mapRows([
      stat({ playerId: "a", teamSide: "A" }),
      stat({ playerId: "b", teamSide: "B" }),
    ]);
    expect(rows.map((r) => r.side).sort()).toEqual(["A", "B"]);
  });

  it("renvoie une liste vide sans statistique", () => {
    expect(mapRows([])).toEqual([]);
  });
});

describe("seriesRows", () => {
  it("cumule les frags et moyenne les indicateurs sur l'ensemble des maps", () => {
    const rows = seriesRows([
      stat({ kills: 20, deaths: 10, assists: 4, acs: 240, rating: 1.2 }),
      stat({ kills: 16, deaths: 14, assists: 6, acs: 200, rating: 1.0 }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      name: "Sh1n",
      kills: 36,
      deaths: 24,
      assists: 10,
      acs: 220,
      rating: 1.1,
    });
  });

  it("garde les joueurs distincts séparés", () => {
    const rows = seriesRows([
      stat({ playerId: "a", pseudo: "Alpha", rating: 1.4 }),
      stat({ playerId: "b", pseudo: "Bravo", rating: 0.8 }),
      stat({ playerId: "a", pseudo: "Alpha", rating: 1.0 }),
    ]);
    expect(rows.map((r) => r.name)).toEqual(["Alpha", "Bravo"]);
    expect(rows[0].rating).toBeCloseTo(1.2);
  });

  it("regroupe sur le Riot ID quand le joueur n'a pas de fiche", () => {
    const rows = seriesRows([
      stat({ playerId: null, pseudo: null, riotName: "Nivera#0000", kills: 10 }),
      stat({ playerId: null, pseudo: null, riotName: "Nivera#0000", kills: 12 }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].kills).toBe(22);
  });

  it("retient l'agent le plus joué de la série", () => {
    const rows = seriesRows([
      stat({ agent: "Jett" }),
      stat({ agent: "Raze" }),
      stat({ agent: "Raze" }),
    ]);
    expect(rows[0].agent).toBe("Raze");
  });

  it("ignore les maps sans agent renseigné dans ce décompte", () => {
    const rows = seriesRows([
      stat({ agent: null }),
      stat({ agent: null }),
      stat({ agent: "Jett" }),
    ]);
    expect(rows[0].agent).toBe("Jett");
  });

  it("renvoie une liste vide sans statistique", () => {
    expect(seriesRows([])).toEqual([]);
  });
});

describe("bySide", () => {
  it("sépare les deux camps en conservant l'ordre reçu", () => {
    const rows = mapRows([
      stat({ playerId: "a", pseudo: "Alpha", teamSide: "A", rating: 1.4 }),
      stat({ playerId: "b", pseudo: "Bravo", teamSide: "B", rating: 1.3 }),
      stat({ playerId: "c", pseudo: "Charlie", teamSide: "A", rating: 1.2 }),
    ]);
    const { a, b } = bySide(rows);
    expect(a.map((r) => r.name)).toEqual(["Alpha", "Charlie"]);
    expect(b.map((r) => r.name)).toEqual(["Bravo"]);
  });
});

describe("kdaLabel", () => {
  it("écrit les trois compteurs séparés par des barres", () => {
    expect(kdaLabel({ kills: 24, deaths: 13, assists: 6 })).toBe("24 / 13 / 6");
  });
});
