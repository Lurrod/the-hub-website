import { describe, it, expect } from "vitest";
import { matchInputSchema, matchMapSchema } from "@/lib/validation/match";

describe("matchInputSchema", () => {
  it("accepte un match de poule valide", () => {
    const r = matchInputSchema.parse({
      teamAId: "a",
      teamBId: "b",
      scoreA: "2",
      scoreB: "1",
      stage: "GROUP",
      status: "FINISHED",
      bestOf: "3",
    });
    expect(r.scoreA).toBe(2);
    expect(r.bestOf).toBe(3);
  });

  it("applique les valeurs par défaut", () => {
    const r = matchInputSchema.parse({ teamAId: "a", teamBId: "b" });
    expect(r.scoreA).toBe(0);
    expect(r.scoreB).toBe(0);
    expect(r.stage).toBe("GROUP");
    expect(r.status).toBe("SCHEDULED");
    expect(r.bestOf).toBe(1);
  });

  it("refuse deux équipes identiques", () => {
    expect(() => matchInputSchema.parse({ teamAId: "a", teamBId: "a" })).toThrow();
  });

  it("refuse un bestOf hors {1,3,5}", () => {
    expect(() => matchInputSchema.parse({ teamAId: "a", teamBId: "b", bestOf: "2" })).toThrow();
  });

  it("refuse un score négatif", () => {
    expect(() => matchInputSchema.parse({ teamAId: "a", teamBId: "b", scoreA: "-1" })).toThrow();
  });

  it("convertit une date fournie en Date", () => {
    const r = matchInputSchema.parse({ teamAId: "a", teamBId: "b", date: "2026-08-01" });
    expect(r.date instanceof Date).toBe(true);
  });
});

describe("matchInputSchema vodUrl", () => {
  const base = { teamAId: "a", teamBId: "b" };
  it("accepte une URL de VOD valide", () => {
    const r = matchInputSchema.parse({ ...base, vodUrl: "https://twitch.tv/videos/1" });
    expect(r.vodUrl).toBe("https://twitch.tv/videos/1");
  });
  it("transforme une chaîne vide en undefined", () => {
    const r = matchInputSchema.parse({ ...base, vodUrl: "" });
    expect(r.vodUrl).toBeUndefined();
  });
  it("refuse une URL invalide", () => {
    expect(() => matchInputSchema.parse({ ...base, vodUrl: "pas-une-url" })).toThrow();
  });
});

describe("matchMapSchema", () => {
  it("accepte une map valide", () => {
    const r = matchMapSchema.parse({ mapName: "Ascent", scoreA: "13", scoreB: "10" });
    expect(r.scoreA).toBe(13);
  });

  it("refuse un nom de map vide", () => {
    expect(() => matchMapSchema.parse({ mapName: "", scoreA: "13", scoreB: "10" })).toThrow();
  });
});
