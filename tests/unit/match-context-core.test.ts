import { describe, it, expect } from "vitest";
import { cutoffWhere, headToHeadTally } from "@/lib/match-context-core";

const BEFORE = new Date("2026-11-02T18:00:00.000Z");

describe("cutoffWhere", () => {
  it("écarte toujours le match affiché", () => {
    expect(cutoffWhere({ before: null, excludeMatchId: "m1" })).toEqual({
      id: { not: "m1" },
    });
  });

  it("borne sur la date quand le match affiché en a une", () => {
    expect(cutoffWhere({ before: BEFORE, excludeMatchId: "m1" })).toEqual({
      id: { not: "m1" },
      date: { lt: BEFORE },
    });
  });

  it("ne pose aucune borne de date quand le match affiché n'en a pas", () => {
    expect(cutoffWhere({ before: null, excludeMatchId: "m1" }).date).toBeUndefined();
  });
});

describe("headToHeadTally", () => {
  it("compte les victoires de chaque équipe", () => {
    const rows = [{ winnerId: "a" }, { winnerId: "b" }, { winnerId: "a" }];
    expect(headToHeadTally(rows, "a", "b")).toEqual({ winsA: 2, winsB: 1 });
  });

  // `winnerId` désigne une équipe, pas un côté : le camp occupé dans la
  // rencontre passée n'entre pas dans le calcul. Ce test verrouille l'absence
  // de raisonnement sur teamAId/teamBId.
  it("ignore le camp occupé lors des rencontres passées", () => {
    const rows = [{ winnerId: "b" }, { winnerId: "b" }];
    expect(headToHeadTally(rows, "a", "b")).toEqual({ winsA: 0, winsB: 2 });
  });

  it("ne compte pas un match terminé sans vainqueur", () => {
    const rows = [{ winnerId: "a" }, { winnerId: null }];
    expect(headToHeadTally(rows, "a", "b")).toEqual({ winsA: 1, winsB: 0 });
  });

  it("ignore un vainqueur étranger aux deux équipes", () => {
    expect(headToHeadTally([{ winnerId: "c" }], "a", "b")).toEqual({ winsA: 0, winsB: 0 });
  });

  it("rend un bilan nul sur une liste vide", () => {
    expect(headToHeadTally([], "a", "b")).toEqual({ winsA: 0, winsB: 0 });
  });
});
