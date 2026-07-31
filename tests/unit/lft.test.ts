import { describe, it, expect } from "vitest";
import { nextLftState, normalizeLftRole, normalizeLftCountry } from "@/lib/lft";

describe("nextLftState", () => {
  const now = new Date("2026-07-31T10:00:00Z");

  it("active le LFT et horodate la mise en recherche", () => {
    expect(nextLftState(false, now)).toEqual({ lft: true, lftSince: now });
  });

  it("désactive le LFT et efface la date", () => {
    expect(nextLftState(true, now)).toEqual({ lft: false, lftSince: null });
  });

  it("est involutif : deux bascules ramènent au même statut", () => {
    const once = nextLftState(false, now);
    expect(nextLftState(once.lft, now).lft).toBe(false);
  });
});

describe("normalizeLftRole", () => {
  it("garde un rôle Valorant connu", () => {
    expect(normalizeLftRole("SENTINEL")).toBe("SENTINEL");
  });

  it("ignore une valeur inconnue", () => {
    expect(normalizeLftRole("HEALER")).toBeUndefined();
  });

  it("ignore une casse incorrecte", () => {
    expect(normalizeLftRole("duelist")).toBeUndefined();
  });

  it("ignore l'absence de filtre", () => {
    expect(normalizeLftRole(undefined)).toBeUndefined();
    expect(normalizeLftRole("")).toBeUndefined();
  });
});

describe("normalizeLftCountry", () => {
  const available = ["France", "Belgique"];

  it("garde un pays présent dans la liste", () => {
    expect(normalizeLftCountry("France", available)).toBe("France");
  });

  it("ignore un pays absent de la liste", () => {
    expect(normalizeLftCountry("Japon", available)).toBeUndefined();
  });

  it("ignore l'absence de filtre", () => {
    expect(normalizeLftCountry(undefined, available)).toBeUndefined();
    expect(normalizeLftCountry("", available)).toBeUndefined();
  });

  it("ignore tout filtre quand aucun pays n'est disponible", () => {
    expect(normalizeLftCountry("France", [])).toBeUndefined();
  });
});
