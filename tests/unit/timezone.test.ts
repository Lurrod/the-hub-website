import { describe, it, expect } from "vitest";
import {
  formatSite,
  hasTimePart,
  parseSiteDateTime,
  toDateInput,
  toDateTimeInput,
} from "@/lib/timezone";

describe("parseSiteDateTime", () => {
  it("interprète la saisie en heure de Paris, pas en UTC", () => {
    // 20h30 saisi par un organisateur français en août = 18h30 UTC.
    expect(parseSiteDateTime("2026-08-05T20:30")?.toISOString()).toBe("2026-08-05T18:30:00.000Z");
  });

  it("tient compte de l'heure d'hiver", () => {
    // En janvier la France est à UTC+1, pas UTC+2.
    expect(parseSiteDateTime("2026-01-15T20:30")?.toISOString()).toBe("2026-01-15T19:30:00.000Z");
  });

  it("place minuit heure de Paris la veille en UTC l'été", () => {
    expect(parseSiteDateTime("2026-08-05T00:00")?.toISOString()).toBe("2026-08-04T22:00:00.000Z");
  });

  it("accepte une date seule, comprise comme minuit heure de Paris", () => {
    expect(parseSiteDateTime("2026-08-05")?.toISOString()).toBe("2026-08-04T22:00:00.000Z");
  });

  it("gère le week-end du changement d'heure", () => {
    // Bascule le 29 mars 2026 à 02h00 : avant on est à UTC+1, après à UTC+2.
    expect(parseSiteDateTime("2026-03-29T01:30")?.toISOString()).toBe("2026-03-29T00:30:00.000Z");
    expect(parseSiteDateTime("2026-03-29T03:30")?.toISOString()).toBe("2026-03-29T01:30:00.000Z");
  });

  it("rejette une chaîne mal formée", () => {
    for (const v of ["", "hier", "2026-13-99T99:99", "05/08/2026", "2026-08-05T20", "2026-02-31", "2026-00-10", "2026-08-05T25:00"]) {
      expect(parseSiteDateTime(v)).toBeNull();
    }
  });
});

describe("hasTimePart", () => {
  it("distingue une date seule d'une date horodatée", () => {
    expect(hasTimePart("2026-08-05")).toBe(false);
    expect(hasTimePart("2026-08-05T20:30")).toBe(true);
  });

  it("est faux sur une chaîne invalide", () => {
    expect(hasTimePart("n'importe quoi")).toBe(false);
  });
});

describe("aller-retour formulaire", () => {
  it("rend la saisie d'origine", () => {
    for (const v of ["2026-08-05T20:30", "2026-01-15T09:05", "2026-12-31T23:59"]) {
      expect(toDateTimeInput(parseSiteDateTime(v))).toBe(v);
    }
  });

  it("rend la date seule pour un input date", () => {
    expect(toDateInput(parseSiteDateTime("2026-08-05T20:30"))).toBe("2026-08-05");
  });

  it("rend une chaîne vide sans date", () => {
    expect(toDateTimeInput(null)).toBe("");
    expect(toDateInput(null)).toBe("");
  });

  it("ramène minuit heure de Paris au bon jour", () => {
    // Piège classique : 22h00 UTC, c'est déjà le lendemain à Paris.
    const minuit = parseSiteDateTime("2026-08-06T00:00")!;
    expect(minuit.toISOString()).toBe("2026-08-05T22:00:00.000Z");
    expect(toDateInput(minuit)).toBe("2026-08-06");
  });
});

describe("formatSite", () => {
  it("affiche l'heure de Paris quel que soit le fuseau du process", () => {
    const d = new Date("2026-08-05T18:30:00.000Z");
    expect(formatSite(d, { hour: "2-digit", minute: "2-digit" })).toBe("20:30");
  });

  it("rend une chaîne vide sans date", () => {
    expect(formatSite(null, { hour: "2-digit" })).toBe("");
  });
});
