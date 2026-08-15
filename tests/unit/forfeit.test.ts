import { describe, it, expect } from "vitest";
import { displayScores, forfeitWinnerId } from "@/lib/forfeit";

describe("forfeitWinnerId", () => {
  it("donne la victoire à l'adversaire du forfaitaire", () => {
    expect(forfeitWinnerId("TEAM_A", "a", "b")).toBe("b");
    expect(forfeitWinnerId("TEAM_B", "a", "b")).toBe("a");
  });

  it("ne décide rien sans forfait", () => {
    expect(forfeitWinnerId("NONE", "a", "b")).toBeNull();
  });
});

describe("displayScores", () => {
  it("affiche W / FF sur un forfait, quel que soit le score saisi", () => {
    // Un forfait se déclare souvent sur un match resté à 0-0 : le score
    // chiffré ne raconte rien, c'est le forfait qui fait le résultat.
    expect(displayScores({ scoreA: 0, scoreB: 0, forfeit: "TEAM_B" })).toEqual({
      a: "W",
      b: "FF",
    });
    expect(displayScores({ scoreA: 1, scoreB: 0, forfeit: "TEAM_A" })).toEqual({
      a: "FF",
      b: "W",
    });
  });

  it("affiche les scores chiffrés hors forfait", () => {
    expect(displayScores({ scoreA: 2, scoreB: 1, forfeit: "NONE" })).toEqual({ a: "2", b: "1" });
    expect(displayScores({ scoreA: 0, scoreB: 0 })).toEqual({ a: "0", b: "0" });
  });
});
