import { describe, it, expect } from "vitest";
import { finishedCutoff, isTournamentOver } from "@/lib/tournament-status";

const NOW = new Date("2026-08-03T14:30:00.000Z");

describe("finishedCutoff", () => {
  it("renvoie minuit UTC du jour courant", () => {
    expect(finishedCutoff(NOW).toISOString()).toBe("2026-08-03T00:00:00.000Z");
  });
});

describe("isTournamentOver", () => {
  it("est faux sans date de fin", () => {
    expect(isTournamentOver({ endDate: null }, NOW)).toBe(false);
  });

  it("est faux quand la date de fin est dans le futur", () => {
    expect(isTournamentOver({ endDate: new Date("2026-08-10T00:00:00.000Z") }, NOW)).toBe(false);
  });

  it("est faux le jour même de la fin", () => {
    expect(isTournamentOver({ endDate: new Date("2026-08-03T00:00:00.000Z") }, NOW)).toBe(false);
  });

  it("est vrai dès le lendemain de la date de fin", () => {
    expect(isTournamentOver({ endDate: new Date("2026-08-02T00:00:00.000Z") }, NOW)).toBe(true);
  });

  it("est vrai pour une date de fin largement dépassée", () => {
    expect(isTournamentOver({ endDate: new Date("2025-01-01T00:00:00.000Z") }, NOW)).toBe(true);
  });
});
