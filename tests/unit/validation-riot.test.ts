import { describe, it, expect } from "vitest";
import { parseRiotId, riotIdSchema } from "@/lib/validation/riot";

describe("parseRiotId", () => {
  it("découpe Nom#Tag", () => {
    expect(parseRiotId("Hub Player#EUW1")).toEqual({ name: "Hub Player", tag: "EUW1" });
  });
  it("trim les espaces", () => {
    expect(parseRiotId("  Zed#123 ")).toEqual({ name: "Zed", tag: "123" });
  });
  it("rejette sans #", () => {
    expect(() => parseRiotId("NoTag")).toThrow("RIOT_FORMAT");
  });
  it("rejette un tag trop court", () => {
    expect(() => parseRiotId("Name#ab")).toThrow("RIOT_FORMAT");
  });
  it("rejette un nom trop court", () => {
    expect(() => parseRiotId("ab#1234")).toThrow("RIOT_FORMAT");
  });
});

describe("riotIdSchema", () => {
  it("accepte un Riot ID valide", () => {
    expect(riotIdSchema.safeParse("Player One#EUW").success).toBe(true);
  });
  it("rejette un format invalide", () => {
    expect(riotIdSchema.safeParse("bad").success).toBe(false);
  });
});
