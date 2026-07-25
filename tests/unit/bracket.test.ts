import { describe, it, expect } from "vitest";
import {
  orderBracketRounds,
  orderBracketSections,
  parseRound,
  type BracketMatchData,
} from "@/lib/bracket";

const mk = (id: string, round: string | null): BracketMatchData => ({
  id,
  round,
  teamAId: "a",
  teamBId: "b",
  scoreA: 0,
  scoreB: 0,
  winnerId: null,
  teamA: { tag: "A" },
  teamB: { tag: "B" },
});

describe("orderBracketRounds", () => {
  it("ordonne Demi-finales avant Finale", () => {
    const rounds = orderBracketRounds([mk("2", "Finale"), mk("1", "Demi-finales")]);
    expect(rounds.map((r) => r.name)).toEqual(["Demi-finales", "Finale"]);
  });
  it("regroupe par round et trie les matchs par id", () => {
    const rounds = orderBracketRounds([mk("b", "Demi-finales"), mk("a", "Demi-finales")]);
    expect(rounds).toHaveLength(1);
    expect(rounds[0].matches.map((m) => m.id)).toEqual(["a", "b"]);
  });
  it("place un round inconnu après les rounds connus", () => {
    const rounds = orderBracketRounds([mk("1", "Repêchage"), mk("2", "Finale")]);
    expect(rounds[rounds.length - 1].name).toBe("Repêchage");
  });
});

describe("parseRound", () => {
  it("détecte les sections upper / lower / finale", () => {
    expect(parseRound("UB Finale")).toEqual({ section: "upper", label: "Finale" });
    expect(parseRound("LB Round 1")).toEqual({ section: "lower", label: "Round 1" });
    expect(parseRound("Lower Bracket Finale")).toEqual({ section: "lower", label: "Finale" });
    expect(parseRound("Grande Finale")).toEqual({ section: "final", label: "Grande Finale" });
    expect(parseRound("Demi-finales")).toEqual({ section: "single", label: "Demi-finales" });
  });
});

describe("orderBracketSections (double élimination)", () => {
  it("sépare et ordonne upper, lower puis grande finale", () => {
    const sections = orderBracketSections([
      mk("gf", "Grande Finale"),
      mk("lb", "LB Finale"),
      mk("ub1", "UB Demi-finale"),
      mk("ub2", "UB Demi-finale"),
      mk("ubf", "UB Finale"),
    ]);
    expect(sections.map((s) => s.key)).toEqual(["upper", "lower", "final"]);
    expect(sections[0].rounds.map((r) => r.name)).toEqual(["Demi-finale", "Finale"]);
    expect(sections[2].title).toBe("Grande Finale");
  });
});
