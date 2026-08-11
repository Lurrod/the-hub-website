import { describe, it, expect } from "vitest";
import { bySide, kdaLabel, mapRows, seriesRows, type RawStat } from "@/lib/og/scoreboard";
import type { SeriesInputRow } from "@/lib/scoreboard-series";

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

  it("porte l'agent de la map dans une liste à une entrée", () => {
    expect(mapRows([stat({ agent: "Jett" })])[0].agents).toEqual(["Jett"]);
  });

  it("laisse la liste d'agents vide quand la map n'en renseigne aucun", () => {
    expect(mapRows([stat({ agent: null })])[0].agents).toEqual([]);
  });

  it("renvoie une liste vide sans statistique", () => {
    expect(mapRows([])).toEqual([]);
  });
});

describe("seriesRows", () => {
  /*
   * Le cumul lui-même est couvert dans tests/unit/scoreboard-series.test.ts :
   * `seriesRows` n'est plus qu'un adaptateur vers la forme des cartes.
   */
  const serieRow = (over: Partial<SeriesInputRow> = {}): SeriesInputRow => ({
    id: "x",
    playerId: "p1",
    pseudo: "Sh1n",
    riotName: "Sh1n#EUW",
    teamSide: "A",
    agent: "Jett",
    kills: 20,
    deaths: 10,
    assists: 5,
    acs: 250,
    adr: 160,
    rating: 1.2,
    kast: 74,
    firstKills: 4,
    firstDeaths: 2,
    ...over,
  });

  it("met le cumul à la forme d'une carte, classé du meilleur rating au moins bon", () => {
    const rows = seriesRows([
      {
        rounds: 24,
        stats: [
          serieRow({ playerId: "a", pseudo: "Alpha", kills: 30, deaths: 8 }),
          serieRow({ playerId: "b", pseudo: "Bravo", kills: 8, deaths: 25, teamSide: "B" }),
        ],
      },
      {
        rounds: 20,
        stats: [
          serieRow({ playerId: "a", pseudo: "Alpha", kills: 25, deaths: 9 }),
          serieRow({ playerId: "b", pseudo: "Bravo", kills: 7, deaths: 22, teamSide: "B" }),
        ],
      },
    ]);

    expect(rows.map((r) => r.name)).toEqual(["Alpha", "Bravo"]);
    expect(rows[0]).toMatchObject({ kills: 55, deaths: 17, side: "A" });
    expect(rows[1]).toMatchObject({ kills: 15, deaths: 47, side: "B" });
  });

  it("reprend la liste des agents du cumul", () => {
    const rows = seriesRows([
      { rounds: 24, stats: [serieRow({ agent: "Jett" })] },
      { rounds: 24, stats: [serieRow({ agent: "Raze" })] },
      { rounds: 24, stats: [serieRow({ agent: "Raze" })] },
    ]);
    expect(rows[0].agents).toEqual(["Raze", "Jett"]);
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
    expect(kdaLabel({ kills: 24, deaths: 13, assists: 6 })).toBe("24/13/6");
  });

  it("reste sur une ligne quand les compteurs passent à trois chiffres", () => {
    expect(kdaLabel({ kills: 146, deaths: 120, assists: 88 })).toBe("146/120/88");
  });
});
