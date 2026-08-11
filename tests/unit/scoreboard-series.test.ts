import { describe, it, expect } from "vitest";
import { aggregateSeries, type SeriesInputRow, type SeriesMap } from "@/lib/scoreboard-series";
import { computeRating } from "@/lib/match-stats-core";

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

/** Une map de `rounds` rounds portant les lignes données. */
const map = (rounds: number, ...stats: SeriesInputRow[]): SeriesMap => ({ rounds, stats });

describe("aggregateSeries", () => {
  it("additionne les compteurs", () => {
    const rows = aggregateSeries([
      map(24, row({ kills: 20, deaths: 10, assists: 4, firstKills: 4, firstDeaths: 2 })),
      map(24, row({ kills: 16, deaths: 14, assists: 6, firstKills: 3, firstDeaths: 5 })),
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      kills: 36,
      deaths: 24,
      assists: 10,
      firstKills: 7,
      firstDeaths: 7,
      rounds: 48,
      mapsPlayed: 2,
    });
  });

  it("pondère les moyennes par le nombre de rounds de chaque map", () => {
    // 20 rounds à 240 d'ACS et 10 rounds à 300 : la map longue doit peser
    // deux fois plus. Moyenne simple = 270, moyenne pondérée = 260.
    const rows = aggregateSeries([
      map(20, row({ acs: 240, adr: 140, kast: 60 })),
      map(10, row({ acs: 300, adr: 170, kast: 90 })),
    ]);

    expect(rows[0].acs).toBe(260);
    expect(rows[0].adr).toBe(150);
    expect(rows[0].kast).toBe(70);
  });

  it("retombe sur la moyenne simple quand les maps font le même nombre de rounds", () => {
    const rows = aggregateSeries([
      map(24, row({ acs: 240, adr: 140 })),
      map(24, row({ acs: 200, adr: 160 })),
    ]);

    expect(rows[0].acs).toBe(220);
    expect(rows[0].adr).toBe(150);
  });

  it("recalcule le rating sur les totaux de la série au lieu de moyenner", () => {
    // Une bonne map courte et une mauvaise map longue. Chaque ligne porte le
    // rating que la formule donne pour SES chiffres, sans quoi la comparaison
    // avec la moyenne ne voudrait rien dire.
    const courte = { kills: 20, deaths: 8, assists: 4, acs: 300, adr: 190, kast: 82 };
    const longue = { kills: 12, deaths: 22, assists: 5, acs: 150, adr: 95, kast: 58 };
    const ratingCourte = computeRating({ rounds: 17, ...courte, kastPct: courte.kast });
    const ratingLongue = computeRating({ rounds: 24, ...longue, kastPct: longue.kast });

    const rows = aggregateSeries([
      map(17, row({ ...courte, rating: ratingCourte })),
      map(24, row({ ...longue, rating: ratingLongue })),
    ]);

    const attendu = computeRating({
      rounds: 41,
      kills: 32,
      deaths: 30,
      assists: 9,
      kastPct: (82 * 17 + 58 * 24) / 41,
      adr: (190 * 17 + 95 * 24) / 41,
    });

    expect(rows[0].rating).toBe(attendu);
    // La map longue pèse davantage : le cumul tombe sous la moyenne des deux.
    const moyenneSimple = (ratingCourte + ratingLongue) / 2;
    expect(rows[0].rating).toBeLessThan(moyenneSimple);
  });

  it("ne compte que les maps réellement jouées par le joueur", () => {
    const rows = aggregateSeries([
      map(20, row({ playerId: "titulaire", acs: 200 }), row({ playerId: "remplacant", acs: 300 })),
      map(30, row({ playerId: "titulaire", acs: 100 })),
    ]);

    const remplacant = rows.find((r) => r.playerId === "remplacant");
    const titulaire = rows.find((r) => r.playerId === "titulaire");
    expect(remplacant).toMatchObject({ acs: 300, mapsPlayed: 1, rounds: 20 });
    // (200×20 + 100×30) / 50 = 140, et non la moyenne simple 150.
    expect(titulaire).toMatchObject({ acs: 140, mapsPlayed: 2, rounds: 50 });
  });

  it("liste les agents joués, du plus joué au moins joué", () => {
    const rows = aggregateSeries([
      map(24, row({ agent: "Jett" })),
      map(24, row({ agent: "Raze" })),
      map(24, row({ agent: "Raze" })),
    ]);
    expect(rows[0].agents).toEqual(["Raze", "Jett"]);
  });

  it("départage deux agents à égalité par leur nom", () => {
    const rows = aggregateSeries([
      map(24, row({ agent: "Raze" })),
      map(24, row({ agent: "Jett" })),
    ]);
    expect(rows[0].agents).toEqual(["Jett", "Raze"]);
  });

  it("garde l'agent le plus joué dans le champ simple, pour les usages existants", () => {
    const rows = aggregateSeries([
      map(24, row({ agent: "Jett" })),
      map(24, row({ agent: "Raze" })),
      map(24, row({ agent: "Raze" })),
    ]);
    expect(rows[0].agent).toBe("Raze");
  });

  it("regroupe sur le Riot ID quand le joueur n'a pas de fiche", () => {
    const rows = aggregateSeries([
      map(24, row({ playerId: null, pseudo: null, riotName: "Nivera#0000", kills: 10 })),
      map(24, row({ playerId: null, pseudo: null, riotName: "Nivera#0000", kills: 12 })),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].kills).toBe(22);
  });

  it("conserve le camp du joueur", () => {
    const rows = aggregateSeries([
      map(24, row({ playerId: "a", teamSide: "A" }), row({ playerId: "b", teamSide: "B" })),
    ]);
    expect(rows.find((r) => r.playerId === "a")?.teamSide).toBe("A");
    expect(rows.find((r) => r.playerId === "b")?.teamSide).toBe("B");
  });

  it("donne à chaque ligne agrégée un identifiant stable", () => {
    const un = aggregateSeries([map(24, row({ playerId: "p1" }))]);
    const deux = aggregateSeries([
      map(24, row({ playerId: "p1" })),
      map(24, row({ playerId: "p1" })),
    ]);
    expect(un[0].id).toBe(deux[0].id);
  });

  it("ne divise jamais par zéro sur une map sans round enregistré", () => {
    const rows = aggregateSeries([map(0, row())]);
    expect(rows[0].acs).toBe(250);
    expect(rows[0].rating).toBe(0);
  });

  it("accepte une série sans aucune statistique", () => {
    expect(aggregateSeries([map(24), map(24)])).toEqual([]);
    expect(aggregateSeries([])).toEqual([]);
  });
});
