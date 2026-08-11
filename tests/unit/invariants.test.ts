import { describe, it, expect } from "vitest";
import { computeRating, seriesScore } from "@/lib/match-stats-core";
import { buildPlayerOverview, type PlayerStatRow } from "@/lib/player-overview-core";
import { aggregateSeries, type SeriesInputRow } from "@/lib/scoreboard-series";

/*
 * Propriétés des indicateurs dérivés, par opposition à leurs valeurs.
 *
 * Le rating a vécu décentré de 0,16 sur toutes les fiches sans qu'aucun test ne
 * puisse l'attraper : ils vérifiaient tous que la fonction rendait ce qui avait
 * été codé, aucun qu'elle rendait ce qu'elle devait rendre. Ces tests-ci
 * expriment des relations qui doivent tenir quels que soient les coefficients.
 */

const ligne = (over: Partial<Parameters<typeof computeRating>[0]> = {}) => ({
  rounds: 24,
  kills: 18,
  deaths: 14,
  assists: 6,
  kastPct: 72,
  adr: 145,
  ...over,
});

describe("rating : monotonie", () => {
  it("monte quand les frags montent, toutes choses égales par ailleurs", () => {
    expect(computeRating(ligne({ kills: 22 }))).toBeGreaterThan(computeRating(ligne()));
  });

  it("descend quand les morts montent", () => {
    expect(computeRating(ligne({ deaths: 20 }))).toBeLessThan(computeRating(ligne()));
  });

  it("monte avec le KAST et avec l'ADR", () => {
    expect(computeRating(ligne({ kastPct: 85 }))).toBeGreaterThan(computeRating(ligne()));
    expect(computeRating(ligne({ adr: 190 }))).toBeGreaterThan(computeRating(ligne()));
  });

  it("classe une ligne strictement meilleure au-dessus, sur tout un balayage", () => {
    // Une propriété doit tenir partout, pas sur un cas choisi : on balaie.
    for (let kills = 5; kills <= 30; kills += 5) {
      for (let deaths = 5; deaths <= 25; deaths += 5) {
        const base = computeRating(ligne({ kills, deaths }));
        const meilleur = computeRating(ligne({ kills: kills + 3, deaths: deaths - 1 }));
        expect(meilleur, `${kills}/${deaths}`).toBeGreaterThanOrEqual(base);
      }
    }
  });
});

describe("rating : bornes", () => {
  it("n'est jamais négatif, même sur une ligne catastrophique", () => {
    const pire = computeRating({
      rounds: 24,
      kills: 0,
      deaths: 24,
      assists: 0,
      kastPct: 0,
      adr: 0,
    });
    expect(pire).toBeGreaterThan(0);
  });

  it("vaut zéro sans round joué, plutôt qu'un NaN", () => {
    expect(computeRating(ligne({ rounds: 0 }))).toBe(0);
  });

  it("reste dans une plage plausible sur une ligne d'exception", () => {
    // Garde-fou d'échelle : si un jour un coefficient dérape, une performance
    // hors norme sortirait à 5 ou à 0,2 et ce test le dirait.
    const exceptionnel = computeRating({
      rounds: 24,
      kills: 35,
      deaths: 8,
      assists: 10,
      kastPct: 95,
      adr: 260,
    });
    expect(exceptionnel).toBeGreaterThan(1.5);
    expect(exceptionnel).toBeLessThan(3);
  });
});

describe("score de série", () => {
  it("ne distribue jamais plus de maps qu'il n'en a été jouées", () => {
    const maps = [
      { scoreA: 13, scoreB: 9 },
      { scoreA: 7, scoreB: 13 },
      { scoreA: 13, scoreB: 11 },
      // Une map nulle n'est comptée pour personne.
      { scoreA: 12, scoreB: 12 },
    ];
    const { scoreA, scoreB } = seriesScore(maps);
    expect(scoreA + scoreB).toBeLessThanOrEqual(maps.length);
    expect(scoreA + scoreB).toBe(3);
  });
});

describe("aperçu d'un joueur", () => {
  const row = (over: Partial<PlayerStatRow> = {}): PlayerStatRow => ({
    matchId: "m",
    mapName: "Ascent",
    date: new Date("2026-08-01T00:00:00Z"),
    agent: "Jett",
    kills: 20,
    deaths: 10,
    assists: 5,
    acs: 250,
    adr: 160,
    hsPct: 25,
    kast: 74,
    rating: 1.2,
    firstKills: 4,
    firstDeaths: 2,
    win: true,
    opponentTag: "OPP",
    ...over,
  });

  it("répartit exactement 100 % entre les agents affichés et le reste", () => {
    // Le disque doit fermer, quel que soit le nombre d'agents et de maps.
    // Arrondir chaque part indépendamment donnait 102 % sur neuf agents en
    // quarante maps : c'est cet invariant qui l'a dit.
    for (const agents of [1, 2, 3, 6, 7, 9, 13]) {
      for (const maps of [1, 7, 23, 40, 97]) {
        const rows = Array.from({ length: maps }, (_, i) =>
          row({ agent: `Agent${i % agents}`, matchId: `m${i}` })
        );
        const o = buildPlayerOverview(rows);
        const total = o.agents.reduce((n, a) => n + a.pct, 0) + (o.agentsOther?.pct ?? 0);
        expect(total, `${agents} agents sur ${maps} maps`).toBe(100);
      }
    }
  });

  it("ne compte aucune part pour un joueur sans agent renseigné", () => {
    const o = buildPlayerOverview([row({ agent: null }), row({ agent: null, matchId: "m2" })]);
    expect(o.agents).toEqual([]);
    expect(o.agentsOther).toBeNull();
  });

  it("compte autant de maps que de lignes reçues", () => {
    const rows = Array.from({ length: 7 }, (_, i) => row({ matchId: `m${i}` }));
    expect(buildPlayerOverview(rows).maps).toBe(7);
  });

  it("garde le K/D cohérent avec les frags et les morts cumulés", () => {
    const rows = [row({ kills: 20, deaths: 10 }), row({ kills: 10, deaths: 10, matchId: "m2" })];
    const o = buildPlayerOverview(rows);
    expect(o.kills).toBe(30);
    expect(o.deaths).toBe(20);
    expect(o.kd).toBeCloseTo(30 / 20, 2);
  });

  it("ne divise pas par zéro sur un joueur sans map", () => {
    const o = buildPlayerOverview([]);
    expect(o.maps).toBe(0);
    expect(Number.isFinite(o.kd)).toBe(true);
    expect(Number.isFinite(o.avgRating)).toBe(true);
  });

  it("ne gagne jamais plus de maps qu'il n'en a joué sur une map donnée", () => {
    const rows = [
      row({ mapName: "Bind", win: true }),
      row({ mapName: "Bind", win: false, matchId: "m2" }),
      row({ mapName: "Bind", win: true, matchId: "m3" }),
    ];
    const bind = buildPlayerOverview(rows).mapRecords.find((m) => m.mapName === "Bind");
    expect(bind?.wins).toBeLessThanOrEqual(bind?.maps ?? 0);
    expect(bind).toMatchObject({ maps: 3, wins: 2 });
  });
});

describe("cumul de série : conservation", () => {
  const row = (over: Partial<SeriesInputRow> = {}): SeriesInputRow => ({
    id: "s",
    playerId: "p1",
    pseudo: "P",
    riotName: "P#EUW",
    teamSide: "A",
    agent: "Jett",
    kills: 10,
    deaths: 10,
    assists: 4,
    acs: 200,
    adr: 130,
    rating: 1,
    kast: 70,
    firstKills: 2,
    firstDeaths: 2,
    ...over,
  });

  it("ne perd ni n'invente aucun frag en agrégeant", () => {
    // Propriété de conservation : ce qui entre doit ressortir. C'est ce qui
    // distingue une agrégation d'une transformation qui perd des lignes.
    const maps = [
      { rounds: 24, stats: [row({ kills: 12 }), row({ playerId: "p2", kills: 8 })] },
      { rounds: 20, stats: [row({ kills: 9 }), row({ playerId: "p2", kills: 15 })] },
      { rounds: 22, stats: [row({ kills: 11 })] },
    ];
    const entree = maps.flatMap((m) => m.stats).reduce((n, r) => n + r.kills, 0);
    const sortie = aggregateSeries(maps).reduce((n, r) => n + r.kills, 0);
    expect(sortie).toBe(entree);
  });

  it("garde chaque moyenne dans l'intervalle des valeurs qui la composent", () => {
    // Une moyenne pondérée ne peut pas sortir de l'enveloppe de ses termes :
    // c'est ce qui aurait dénoncé une pondération inversée.
    const maps = [
      { rounds: 17, stats: [row({ acs: 300, adr: 190, kast: 85 })] },
      { rounds: 24, stats: [row({ acs: 150, adr: 95, kast: 55 })] },
    ];
    const [cumul] = aggregateSeries(maps);
    expect(cumul.acs).toBeGreaterThanOrEqual(150);
    expect(cumul.acs).toBeLessThanOrEqual(300);
    expect(cumul.adr).toBeGreaterThanOrEqual(95);
    expect(cumul.adr).toBeLessThanOrEqual(190);
    expect(cumul.kast).toBeGreaterThanOrEqual(55);
    expect(cumul.kast).toBeLessThanOrEqual(85);
  });

  it("penche du côté de la map la plus longue", () => {
    // La pondération n'est observable que si les deux maps diffèrent en
    // longueur : le cumul doit tomber plus près de la plus longue.
    const maps = [
      { rounds: 10, stats: [row({ acs: 300 })] },
      { rounds: 30, stats: [row({ acs: 100 })] },
    ];
    const [cumul] = aggregateSeries(maps);
    expect(cumul.acs).toBe(150);
    expect(cumul.acs).toBeLessThan(200); // la moyenne simple aurait donné 200
  });
});
