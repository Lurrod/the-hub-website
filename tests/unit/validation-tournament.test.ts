import { describe, it, expect } from "vitest";
import { tournamentInputSchema, participantAddSchema } from "@/lib/validation/tournament";

describe("tournamentInputSchema", () => {
  it("accepte un tournoi minimal valide", () => {
    const r = tournamentInputSchema.parse({
      name: "Cup",
      region: "France",
      format: "GROUPS",
      status: "UPCOMING",
    });
    expect(r.name).toBe("Cup");
    expect(r.startDate).toBeUndefined();
  });

  it("refuse un nom vide", () => {
    expect(() =>
      tournamentInputSchema.parse({ name: "", region: "France", format: "GROUPS" })
    ).toThrow();
  });

  it("refuse une région inconnue", () => {
    expect(() =>
      tournamentInputSchema.parse({ name: "Cup", region: "Mars", format: "GROUPS" })
    ).toThrow();
  });

  it("refuse un format inconnu", () => {
    expect(() =>
      tournamentInputSchema.parse({ name: "Cup", region: "France", format: "XXX" })
    ).toThrow();
  });

  it("convertit les dates fournies en objets Date", () => {
    const r = tournamentInputSchema.parse({
      name: "Cup",
      region: "France",
      format: "GROUPS",
      startDate: "2026-08-01",
      endDate: "2026-08-10",
    });
    expect(r.startDate instanceof Date).toBe(true);
    expect(r.endDate instanceof Date).toBe(true);
  });

  it("refuse une date de fin avant la date de début", () => {
    expect(() =>
      tournamentInputSchema.parse({
        name: "Cup",
        region: "France",
        format: "GROUPS",
        startDate: "2026-08-10",
        endDate: "2026-08-01",
      })
    ).toThrow();
  });
});

describe("participantAddSchema", () => {
  it("accepte teamId avec seed (coercition string -> number)", () => {
    const r = participantAddSchema.parse({ teamId: "t1", seed: "3" });
    expect(r.seed).toBe(3);
  });

  it("accepte teamId sans seed", () => {
    const r = participantAddSchema.parse({ teamId: "t1" });
    expect(r.seed).toBeUndefined();
  });

  it("refuse teamId vide", () => {
    expect(() => participantAddSchema.parse({ teamId: "" })).toThrow();
  });
});
