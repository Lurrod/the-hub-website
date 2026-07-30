import { describe, it, expect } from "vitest";
import {
  daysUntil,
  countdownLabel,
  monthKey,
  monthLabel,
  dayKey,
  computeAge,
  durationSince,
} from "@/lib/dates";

const now = new Date("2026-07-25T12:00:00");

describe("daysUntil", () => {
  it("retourne null si pas de date", () => {
    expect(daysUntil(null, now)).toBe(null);
  });
  it("0 pour aujourd'hui", () => {
    expect(daysUntil(new Date("2026-07-25T23:00:00"), now)).toBe(0);
  });
  it("positif pour le futur", () => {
    expect(daysUntil(new Date("2026-07-30T08:00:00"), now)).toBe(5);
  });
  it("négatif pour le passé", () => {
    expect(daysUntil(new Date("2026-07-20T08:00:00"), now)).toBe(-5);
  });
});

describe("countdownLabel", () => {
  it("gère les cas particuliers", () => {
    expect(countdownLabel(null)).toBe("Date à définir");
    expect(countdownLabel(0)).toBe("Aujourd'hui");
    expect(countdownLabel(1)).toBe("Demain");
    expect(countdownLabel(5)).toBe("Dans 5 j");
    expect(countdownLabel(-1)).toBe("Hier");
    expect(countdownLabel(-3)).toBe("Terminé");
  });
});

describe("monthKey / monthLabel", () => {
  it("clé stable par mois", () => {
    expect(monthKey(new Date("2026-07-25T12:00:00"))).toBe("2026-07");
    expect(monthKey(null)).toBe("0000-00");
  });
  it("libellé capitalisé", () => {
    expect(monthLabel(new Date("2026-07-25T12:00:00"))).toBe("Juillet 2026");
    expect(monthLabel(null)).toBe("Dates à définir");
  });
});

describe("dayKey", () => {
  it("groupe par jour", () => {
    expect(dayKey(new Date("2026-07-25T23:59:00"))).toBe("2026-07-25");
    expect(dayKey(null)).toBe("no-date");
  });
});

describe("computeAge", () => {
  it("retourne null sans date de naissance", () => {
    expect(computeAge(null, now)).toBe(null);
  });
  it("compte les années révolues", () => {
    expect(computeAge(new Date("2000-07-25"), now)).toBe(26);
  });
  it("retire un an si l'anniversaire n'est pas passé", () => {
    expect(computeAge(new Date("2000-07-26"), now)).toBe(25);
  });
});

describe("durationSince", () => {
  it("retourne null sans date", () => {
    expect(durationSince(null, now)).toBe(null);
  });
  it("compte en jours sous un mois", () => {
    expect(durationSince(new Date("2026-07-13T12:00:00"), now)).toBe("12 j");
  });
  it("compte en mois sous un an", () => {
    expect(durationSince(new Date("2025-11-25T12:00:00"), now)).toBe("8 mois");
  });
  it("compte en années au-delà", () => {
    expect(durationSince(new Date("2025-07-25T12:00:00"), now)).toBe("1 an");
    expect(durationSince(new Date("2023-01-10T12:00:00"), now)).toBe("3 ans");
  });
});
