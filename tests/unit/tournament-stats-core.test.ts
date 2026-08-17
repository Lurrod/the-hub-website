import { describe, it, expect } from "vitest";
import {
  computeOverview,
  computeAgentMeta,
  computeMapPool,
  computeMarginBuckets,
  MARGIN_BUCKETS,
  type MapLine,
} from "@/lib/tournament-stats-core";

const map = (
  scoreA: number,
  scoreB: number,
  mapName = "Ascent",
  durationSec: number | null = 2400
): MapLine => ({ mapName, scoreA, scoreB, durationSec });

describe("computeOverview", () => {
  it("cumule cartes, rounds, kills et durée", () => {
    const o = computeOverview(
      [map(13, 7), map(13, 11, "Bind", 3000)],
      [{ kills: 20 }, { kills: 15 }]
    );
    expect(o.mapsPlayed).toBe(2);
    expect(o.rounds).toBe(44);
    expect(o.kills).toBe(35);
    expect(o.durationSec).toBe(5400);
  });

  it("compte les prolongations : un score au-delà de 13", () => {
    const o = computeOverview([map(15, 13), map(13, 5), map(14, 12)], []);
    expect(o.otMaps).toBe(2);
  });

  it("ignore les durées absentes sans casser le cumul", () => {
    const o = computeOverview([map(13, 7, "Ascent", null), map(13, 9)], []);
    expect(o.durationSec).toBe(2400);
  });
});

describe("computeAgentMeta", () => {
  it("classe les persos par nombre de picks, part en pourcentage", () => {
    const meta = computeAgentMeta(["Jett", "Jett", "Omen", null, "Jett", "Omen"]);
    expect(meta[0]).toEqual({ agent: "Jett", picks: 3, pct: 60 });
    expect(meta[1]).toEqual({ agent: "Omen", picks: 2, pct: 40 });
  });

  it("sans aucun agent renseigné, renvoie une liste vide", () => {
    expect(computeAgentMeta([null, null])).toEqual([]);
  });
});

describe("computeMapPool", () => {
  it("agrège par carte : parties, prolongations, écart moyen", () => {
    const pool = computeMapPool([map(13, 7, "Ascent"), map(15, 13, "Ascent"), map(13, 2, "Bind")]);
    expect(pool[0]).toMatchObject({ mapName: "Ascent", played: 2, otCount: 1, avgMargin: 4 });
    expect(pool[1]).toMatchObject({ mapName: "Bind", played: 1, otCount: 0, avgMargin: 11 });
  });

  it("trie par nombre de parties décroissant", () => {
    const pool = computeMapPool([map(13, 7, "Bind"), map(13, 7, "Haven"), map(13, 7, "Haven")]);
    expect(pool.map((p) => p.mapName)).toEqual(["Haven", "Bind"]);
  });

  it("arrondit l'écart moyen à une décimale", () => {
    const pool = computeMapPool([map(13, 10, "Lotus"), map(13, 5, "Lotus"), map(13, 6, "Lotus")]);
    // écarts 3, 8, 7 → moyenne 6 ; avec 3, 8, 8 → 6.3
    expect(pool[0].avgMargin).toBe(6);
    const pool2 = computeMapPool([map(13, 10, "Lotus"), map(13, 5, "Lotus"), map(13, 5, "Lotus")]);
    expect(pool2[0].avgMargin).toBe(6.3);
  });
});

describe("computeMarginBuckets", () => {
  it("répartit chaque carte dans sa tranche d'écart", () => {
    const buckets = computeMarginBuckets([
      map(15, 13), // écart 2 → serrée
      map(13, 11), // 2 → serrée
      map(13, 9), // 4 → disputée
      map(13, 6), // 7 → nette
      map(13, 1), // 12 → écrasante
    ]);
    expect(buckets.map((b) => b.count)).toEqual([2, 1, 1, 1]);
  });

  it("garde toutes les tranches même vides, dans l'ordre du plus serré au plus large", () => {
    const buckets = computeMarginBuckets([map(13, 0)]);
    expect(buckets).toHaveLength(MARGIN_BUCKETS.length);
    expect(buckets.map((b) => b.count)).toEqual([0, 0, 0, 1]);
  });
});
