import { describe, it, expect } from "vitest";
import { aggregateSeries, type SeriesInputRow } from "@/lib/scoreboard-series";

const row = (over: Partial<SeriesInputRow> = {}): SeriesInputRow => ({
  id: "s1",
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

describe("aggregateSeries", () => {
  it("additionne les compteurs et moyenne les indicateurs", () => {
    const rows = aggregateSeries([
      [row({ kills: 20, deaths: 10, assists: 4, acs: 240, adr: 160, rating: 1.2, kast: 74 })],
      [row({ kills: 16, deaths: 14, assists: 6, acs: 200, adr: 140, rating: 1.0, kast: 70 })],
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      pseudo: "Sh1n",
      kills: 36,
      deaths: 24,
      assists: 10,
      acs: 220,
      adr: 150,
      rating: 1.1,
      kast: 72,
      mapsPlayed: 2,
    });
  });

  it("additionne aussi les entrées et les morts en ouverture", () => {
    const rows = aggregateSeries([
      [row({ firstKills: 4, firstDeaths: 2 })],
      [row({ firstKills: 3, firstDeaths: 5 })],
    ]);
    expect(rows[0]).toMatchObject({ firstKills: 7, firstDeaths: 7 });
  });

  it("arrondit les moyennes affichées en entier, sauf le rating", () => {
    const rows = aggregateSeries([
      [row({ acs: 201, adr: 141, kast: 71, rating: 1.234 })],
      [row({ acs: 200, adr: 140, kast: 70, rating: 1.235 })],
    ]);
    expect(rows[0].acs).toBe(201);
    expect(rows[0].adr).toBe(141);
    expect(rows[0].kast).toBe(71);
    expect(rows[0].rating).toBeCloseTo(1.2345, 4);
  });

  it("ne moyenne que sur les maps réellement jouées par le joueur", () => {
    const rows = aggregateSeries([
      [row({ playerId: "titulaire", acs: 200 }), row({ playerId: "remplacant", acs: 300 })],
      [row({ playerId: "titulaire", acs: 100 })],
    ]);
    const remplacant = rows.find((r) => r.playerId === "remplacant");
    const titulaire = rows.find((r) => r.playerId === "titulaire");
    expect(remplacant?.acs).toBe(300);
    expect(remplacant?.mapsPlayed).toBe(1);
    expect(titulaire?.acs).toBe(150);
    expect(titulaire?.mapsPlayed).toBe(2);
  });

  it("liste les agents joués, du plus joué au moins joué", () => {
    const rows = aggregateSeries([
      [row({ agent: "Jett" })],
      [row({ agent: "Raze" })],
      [row({ agent: "Raze" })],
    ]);
    expect(rows[0].agents).toEqual(["Raze", "Jett"]);
  });

  it("départage deux agents à égalité par leur nom", () => {
    const rows = aggregateSeries([[row({ agent: "Raze" })], [row({ agent: "Jett" })]]);
    expect(rows[0].agents).toEqual(["Jett", "Raze"]);
  });

  it("garde l'agent le plus joué dans le champ simple, pour les usages existants", () => {
    const rows = aggregateSeries([
      [row({ agent: "Jett" })],
      [row({ agent: "Raze" })],
      [row({ agent: "Raze" })],
    ]);
    expect(rows[0].agent).toBe("Raze");
  });

  it("regroupe sur le Riot ID quand le joueur n'a pas de fiche", () => {
    const rows = aggregateSeries([
      [row({ playerId: null, pseudo: null, riotName: "Nivera#0000", kills: 10 })],
      [row({ playerId: null, pseudo: null, riotName: "Nivera#0000", kills: 12 })],
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].kills).toBe(22);
  });

  it("conserve le camp du joueur", () => {
    const rows = aggregateSeries([
      [row({ playerId: "a", teamSide: "A" }), row({ playerId: "b", teamSide: "B" })],
    ]);
    expect(rows.find((r) => r.playerId === "a")?.teamSide).toBe("A");
    expect(rows.find((r) => r.playerId === "b")?.teamSide).toBe("B");
  });

  it("donne à chaque ligne agrégée un identifiant stable", () => {
    const un = aggregateSeries([[row({ playerId: "p1" })]]);
    const deux = aggregateSeries([[row({ playerId: "p1" })], [row({ playerId: "p1" })]]);
    expect(un[0].id).toBe(deux[0].id);
  });

  it("accepte une série sans aucune statistique", () => {
    expect(aggregateSeries([[], []])).toEqual([]);
    expect(aggregateSeries([])).toEqual([]);
  });
});
