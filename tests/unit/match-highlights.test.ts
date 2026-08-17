import { describe, it, expect } from "vitest";
import { computeHighlights } from "@/lib/match-stats-core";
import type { CustomMatchKill } from "@/lib/henrikdev";

const reds = ["a1", "a2", "a3", "a4", "a5"];
const blues = ["b1", "b2", "b3", "b4", "b5"];
const players = [
  ...reds.map((puuid) => ({ puuid, teamId: "Red" })),
  ...blues.map((puuid) => ({ puuid, teamId: "Blue" })),
];

const kill = (
  round: number,
  timeInRoundMs: number,
  killerPuuid: string,
  victimPuuid: string
): CustomMatchKill => ({ round, timeInRoundMs, killerPuuid, victimPuuid, assistantPuuids: [] });

const win = (teamId: string) => ({ winningTeamId: teamId });

describe("computeHighlights — multikills", () => {
  it("compte triples, quadras et aces par round", () => {
    const kills = [
      // Round 0 : a1 fait un triple.
      kill(0, 1000, "a1", "b1"),
      kill(0, 2000, "a1", "b2"),
      kill(0, 3000, "a1", "b3"),
      // Round 1 : a1 fait un ace.
      ...blues.map((b, i) => kill(1, 1000 + i * 500, "a1", b)),
      // Round 2 : b1 fait un quadra.
      ...reds.slice(0, 4).map((a, i) => kill(2, 1000 + i * 500, "b1", a)),
    ];
    const h = computeHighlights(kills, players, [win("Red"), win("Red"), win("Blue")]);
    expect(h.get("a1")).toMatchObject({ triples: 1, quadras: 0, aces: 1 });
    expect(h.get("b1")).toMatchObject({ triples: 0, quadras: 1, aces: 0 });
    expect(h.get("a2")).toMatchObject({ triples: 0, quadras: 0, aces: 0 });
  });

  it("un double kill ne compte pas", () => {
    const kills = [kill(0, 1000, "a1", "b1"), kill(0, 2000, "a1", "b2")];
    const h = computeHighlights(kills, players, [win("Red")]);
    expect(h.get("a1")).toMatchObject({ triples: 0, quadras: 0, aces: 0 });
  });
});

describe("computeHighlights — clutchs", () => {
  it("détecte un 1v2 gagné : tentative, victoire et taille retenues", () => {
    const kills = [
      // a1 ouvre sur trois Blues : il reste b4 et b5.
      kill(0, 1000, "a1", "b1"),
      kill(0, 2000, "a1", "b2"),
      kill(0, 3000, "a1", "b3"),
      // b4 fauche les quatre coéquipiers : a1 se retrouve seul contre deux.
      kill(0, 4000, "b4", "a2"),
      kill(0, 5000, "b4", "a3"),
      kill(0, 6000, "b4", "a4"),
      kill(0, 7000, "b4", "a5"),
      // a1 conclut.
      kill(0, 8000, "a1", "b4"),
      kill(0, 9000, "a1", "b5"),
    ];
    const h = computeHighlights(kills, players, [win("Red")]);
    expect(h.get("a1")).toMatchObject({ clutchWins: 1, clutchAttempts: 1, bestClutch: 2, aces: 1 });
  });

  it("compte la tentative même quand le clutch est perdu", () => {
    const kills = [
      kill(0, 1000, "b1", "a2"),
      kill(0, 2000, "b1", "a3"),
      kill(0, 3000, "b1", "a4"),
      kill(0, 4000, "b1", "a5"),
      kill(0, 5000, "b1", "a1"),
    ];
    const h = computeHighlights(kills, players, [win("Blue")]);
    expect(h.get("a1")).toMatchObject({ clutchWins: 0, clutchAttempts: 1, bestClutch: 0 });
  });

  it("dans un 1v1, les deux joueurs tentent mais un seul gagne", () => {
    const kills = [
      // Chaque camp perd quatre joueurs : b5 passe seul en premier, face aux cinq Reds.
      kill(0, 1000, "a1", "b1"),
      kill(0, 2000, "a1", "b2"),
      kill(0, 3000, "a1", "b3"),
      kill(0, 3500, "a2", "b4"),
      kill(0, 4000, "b5", "a2"),
      kill(0, 4500, "b5", "a3"),
      kill(0, 5000, "b5", "a4"),
      kill(0, 5500, "b5", "a5"),
      // 1v1 : a1 l'emporte.
      kill(0, 6000, "a1", "b5"),
    ];
    const h = computeHighlights(kills, players, [win("Red")]);
    expect(h.get("a1")).toMatchObject({ clutchWins: 1, clutchAttempts: 1, bestClutch: 1 });
    expect(h.get("b5")).toMatchObject({ clutchWins: 0, clutchAttempts: 1, bestClutch: 0 });
  });

  it("garde le meilleur clutch sur plusieurs rounds", () => {
    const oneVsX = (round: number, alive: number) => [
      // a1 réduit d'abord les Blues à `alive`, puis ses coéquipiers tombent.
      ...blues.slice(0, 5 - alive).map((b, i) => kill(round, 1000 + i * 100, "a1", b)),
      ...reds.slice(1).map((a, i) => kill(round, 2000 + i * 100, "b5", a)),
      ...blues.slice(5 - alive).map((b, i) => kill(round, 3000 + i * 100, "a1", b)),
    ];
    const kills = [...oneVsX(0, 1), ...oneVsX(1, 3)];
    const h = computeHighlights(kills, players, [win("Red"), win("Red")]);
    expect(h.get("a1")).toMatchObject({ clutchWins: 2, clutchAttempts: 2, bestClutch: 3 });
  });

  it("sans vainqueur connu pour le round, la tentative reste mais pas la victoire", () => {
    const kills = [
      kill(3, 1000, "b1", "a2"),
      kill(3, 2000, "b1", "a3"),
      kill(3, 3000, "b1", "a4"),
      kill(3, 4000, "b1", "a5"),
    ];
    // Le round 3 n'existe pas dans la liste des rounds fournie.
    const h = computeHighlights(kills, players, [win("Red")]);
    expect(h.get("a1")).toMatchObject({ clutchWins: 0, clutchAttempts: 1 });
  });

  it("sans aucun duel, tout le monde reste à zéro", () => {
    const h = computeHighlights([], players, [win("Red")]);
    expect(h.get("a1")).toEqual({
      triples: 0,
      quadras: 0,
      aces: 0,
      clutchWins: 0,
      clutchAttempts: 0,
      bestClutch: 0,
    });
  });
});
