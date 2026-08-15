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
  it("affiche W / FF sur un forfait terminé, quel que soit le score saisi", () => {
    // Un forfait se déclare souvent sur un match resté à 0-0 : le score
    // chiffré ne raconte rien, c'est le forfait qui fait le résultat.
    expect(displayScores({ scoreA: 0, scoreB: 0, forfeit: "TEAM_B", status: "FINISHED" })).toEqual({
      a: "W",
      b: "FF",
    });
    expect(displayScores({ scoreA: 1, scoreB: 0, forfeit: "TEAM_A", status: "FINISHED" })).toEqual({
      a: "FF",
      b: "W",
    });
  });

  it("n'annonce pas le forfait tant que le match n'est pas terminé", () => {
    // Même règle que la dérivation du vainqueur : déclaré à l'avance, le
    // forfait n'affiche pas W / FF sur un match encore à jouer — et sans
    // statut connu, on s'abstient aussi.
    expect(displayScores({ scoreA: 0, scoreB: 0, forfeit: "TEAM_B", status: "SCHEDULED" })).toEqual(
      { a: "0", b: "0" }
    );
    expect(displayScores({ scoreA: 0, scoreB: 0, forfeit: "TEAM_B", status: "LIVE" })).toEqual({
      a: "0",
      b: "0",
    });
    expect(displayScores({ scoreA: 0, scoreB: 0, forfeit: "TEAM_B" })).toEqual({ a: "0", b: "0" });
  });

  it("affiche les scores chiffrés hors forfait", () => {
    expect(displayScores({ scoreA: 2, scoreB: 1, forfeit: "NONE", status: "FINISHED" })).toEqual({
      a: "2",
      b: "1",
    });
    expect(displayScores({ scoreA: 0, scoreB: 0 })).toEqual({ a: "0", b: "0" });
  });
});
