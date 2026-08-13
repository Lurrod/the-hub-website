import { describe, it, expect } from "vitest";
import {
  cutoffWhere,
  headToHeadTally,
  formEntries,
  formStreak,
  type FormMatchRow,
} from "@/lib/match-context-core";

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
});

describe("headToHeadTally", () => {
  it("compte les victoires de chaque équipe", () => {
    const rows = [{ winnerId: "a" }, { winnerId: "b" }, { winnerId: "a" }];
    expect(headToHeadTally(rows, "a", "b")).toEqual({ winsA: 2, winsB: 1 });
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

const ALPHA = { name: "Alpha Esports", tag: "ALP", logo: null };
const BETA = { name: "Beta Gaming", tag: "BET", logo: "/beta.png" };

/** Rencontre minimale : seuls les camps, le score et le vainqueur importent. */
function row(over: Partial<FormMatchRow> = {}): FormMatchRow {
  return {
    id: "m1",
    date: BEFORE,
    teamAId: "a",
    teamBId: "b",
    scoreA: 2,
    scoreB: 0,
    winnerId: "a",
    teamA: ALPHA,
    teamB: BETA,
    ...over,
  };
}

describe("formEntries", () => {
  it("prend le point de vue de l'équipe placée en A", () => {
    expect(formEntries([row()], "a")).toEqual([
      { id: "m1", date: BEFORE, opponent: BETA, scoreFor: 2, scoreAgainst: 0, result: "WIN" },
    ]);
  });

  // Le camp occupé est une donnée de la rencontre, pas de l'équipe : la même
  // ligne doit se retourner intégralement selon qui la regarde.
  it("retourne le point de vue pour l'équipe placée en B", () => {
    expect(formEntries([row()], "b")).toEqual([
      { id: "m1", date: BEFORE, opponent: ALPHA, scoreFor: 0, scoreAgainst: 2, result: "LOSS" },
    ]);
  });

  it("qualifie un match terminé sans vainqueur", () => {
    const [entry] = formEntries([row({ winnerId: null, scoreA: 1, scoreB: 1 })], "a");
    expect(entry.result).toBe("DRAW");
  });

  it("conserve l'ordre reçu, du plus récent au plus ancien", () => {
    const rows = [row({ id: "recent" }), row({ id: "ancien" })];
    expect(formEntries(rows, "a").map((e) => e.id)).toEqual(["recent", "ancien"]);
  });

  it("rend une liste vide sur une liste vide", () => {
    expect(formEntries([], "a")).toEqual([]);
  });
});

describe("formStreak", () => {
  // Les entrées vont du plus récent au plus ancien ; une série de forme se lit
  // dans le sens du temps. La fonction porte cette inversion, pour que ni la
  // requête ni le composant n'aient à s'en soucier.
  it("rend la suite du plus ancien au plus récent", () => {
    // Jeu volontairement non symétrique : une suite palindrome passerait le
    // test avec ou sans l'inversion, et ne verrouillerait donc rien.
    const rows = [row({ winnerId: "a" }), row({ winnerId: "a" }), row({ winnerId: "b" })];
    expect(formStreak(formEntries(rows, "a"))).toEqual(["LOSS", "WIN", "WIN"]);
  });

  it("rend une suite vide sur une liste vide", () => {
    expect(formStreak([])).toEqual([]);
  });
});
