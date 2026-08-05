import { describe, it, expect } from "vitest";
import { matchInputSchema, matchMapImportSchema, matchMapSchema } from "@/lib/validation/match";

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

  it("refuse un score de série qui dépasse le format (rounds saisis à la place des maps)", () => {
    // 13-11 est un score de rounds : sur un BO1 il gonflerait le classement.
    expect(() =>
      matchInputSchema.parse({ teamAId: "a", teamBId: "b", bestOf: "1", scoreA: "13", scoreB: "11" })
    ).toThrow();
  });

  it("plafonne le score au nombre de maps nécessaires pour gagner", () => {
    const bo3 = matchInputSchema.parse({
      teamAId: "a", teamBId: "b", bestOf: "3", scoreA: "2", scoreB: "1",
    });
    expect(bo3.scoreA).toBe(2);
    expect(() =>
      matchInputSchema.parse({ teamAId: "a", teamBId: "b", bestOf: "3", scoreA: "3" })
    ).toThrow();
    const bo5 = matchInputSchema.parse({ teamAId: "a", teamBId: "b", bestOf: "5", scoreA: "3" });
    expect(bo5.scoreA).toBe(3);
    expect(() =>
      matchInputSchema.parse({ teamAId: "a", teamBId: "b", bestOf: "5", scoreB: "4" })
    ).toThrow();
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

describe("matchMapImportSchema", () => {
  const uuid = "0e3a1f2b-1111-2222-3333-444455556666";

  it("accepte un identifiant de partie Riot et un camp explicite", () => {
    const r = matchMapImportSchema.parse({ riotMatchId: uuid, campOfTeamA: "Blue" });
    expect(r).toEqual({ riotMatchId: uuid, campOfTeamA: "Blue" });
  });
  it("déduit le camp par défaut", () => {
    expect(matchMapImportSchema.parse({ riotMatchId: uuid }).campOfTeamA).toBe("AUTO");
  });
  it("tolère les espaces autour de l'identifiant collé", () => {
    expect(matchMapImportSchema.parse({ riotMatchId: `  ${uuid} ` }).riotMatchId).toBe(uuid);
  });
  it("refuse un identifiant qui n'est pas un UUID", () => {
    expect(() => matchMapImportSchema.parse({ riotMatchId: "12345" })).toThrow();
  });
  it("refuse un camp inconnu", () => {
    expect(() => matchMapImportSchema.parse({ riotMatchId: uuid, campOfTeamA: "Green" })).toThrow();
  });
});
