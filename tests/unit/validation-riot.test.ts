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
  // Compte réel, signalé le 2026-08-31 : le tag porte une espace et l'ancienne
  // règle le refusait. Vérifié auprès de Riot, il existe.
  it("accepte une espace dans le tag", () => {
    expect(parseRiotId("Ruskof#DO IT")).toEqual({ name: "Ruskof", tag: "DO IT" });
  });
  it("accepte la ponctuation dans le nom", () => {
    expect(parseRiotId("T.o.p_1#EUW")).toEqual({ name: "T.o.p_1", tag: "EUW" });
  });
  it("rejette un tag trop long", () => {
    expect(() => parseRiotId("Name#ABCDEF")).toThrow("RIOT_FORMAT");
  });
  it("rejette un caractère de contrôle", () => {
    expect(() => parseRiotId("Na\u0000me#EUW")).toThrow("RIOT_FORMAT");
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
