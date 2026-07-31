import { describe, it, expect } from "vitest";
import {
  nextLftState,
  normalizeLftRole,
  normalizeLftCountry,
  normalizeAgeBracket,
  birthdateRangeForAge,
  normalizeTeamStatus,
  normalizeLftSearch,
  hasActiveLftFilter,
  lftHref,
} from "@/lib/lft";
import { computeAge } from "@/lib/dates";

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

describe("normalizeAgeBracket", () => {
  it("garde une tranche connue", () => {
    expect(normalizeAgeBracket("18-20")).toBe("18-20");
    expect(normalizeAgeBracket("25+")).toBe("25+");
  });

  it("ignore une tranche inconnue ou absente", () => {
    expect(normalizeAgeBracket("30-40")).toBeUndefined();
    expect(normalizeAgeBracket(undefined)).toBeUndefined();
  });
});

describe("birthdateRangeForAge", () => {
  const now = new Date("2026-07-31T12:00:00Z");

  /** Âge de quelqu'un né exactement à cette date, vu depuis `now`. */
  const ageAt = (d: Date) => computeAge(d, now);

  it("ignore une tranche inconnue", () => {
    expect(birthdateRangeForAge("wat", now)).toBeUndefined();
    expect(birthdateRangeForAge(undefined, now)).toBeUndefined();
  });

  it("borne la tranche 18-20 sur les bons anniversaires", () => {
    const r = birthdateRangeForAge("18-20", now)!;
    // Né pile aux bornes : 18 ans tout juste, et 20 ans presque 21.
    expect(ageAt(r.lte)).toBe(18);
    expect(ageAt(new Date(r.gt!.getTime() + 86_400_000))).toBe(20);
  });

  it("laisse la tranche 25+ sans borne basse", () => {
    const r = birthdateRangeForAge("25+", now)!;
    expect(r.gt).toBeUndefined();
    expect(ageAt(r.lte)).toBe(25);
  });

  it("borne les moins de 18 ans sans exclure les tout jeunes", () => {
    const r = birthdateRangeForAge("u18", now)!;
    expect(ageAt(r.lte)).toBe(0);
    expect(ageAt(new Date(r.gt!.getTime() + 86_400_000))).toBe(17);
  });
});

describe("normalizeTeamStatus", () => {
  it("garde un statut connu", () => {
    expect(normalizeTeamStatus("free")).toBe("free");
    expect(normalizeTeamStatus("team")).toBe("team");
  });

  it("ignore un statut inconnu", () => {
    expect(normalizeTeamStatus("benched")).toBeUndefined();
    expect(normalizeTeamStatus(undefined)).toBeUndefined();
  });
});

describe("normalizeLftSearch", () => {
  it("coupe les espaces autour", () => {
    expect(normalizeLftSearch("  alfa ")).toBe("alfa");
  });

  it("ignore une recherche vide", () => {
    expect(normalizeLftSearch("   ")).toBeUndefined();
    expect(normalizeLftSearch(undefined)).toBeUndefined();
  });

  it("borne la longueur", () => {
    expect(normalizeLftSearch("a".repeat(200))).toHaveLength(40);
  });
});

describe("hasActiveLftFilter", () => {
  it("est faux sans aucun filtre", () => {
    expect(hasActiveLftFilter({})).toBe(false);
    expect(hasActiveLftFilter({ role: undefined, q: undefined })).toBe(false);
  });

  it("est vrai dès qu'un filtre est posé", () => {
    expect(hasActiveLftFilter({ q: "alfa" })).toBe(true);
    expect(hasActiveLftFilter({ role: "SENTINEL" })).toBe(true);
  });
});

describe("lftHref", () => {
  it("renvoie la page nue sans filtre", () => {
    expect(lftHref({})).toBe("/lft");
    expect(lftHref({ role: undefined })).toBe("/lft");
  });

  it("conserve les filtres actifs", () => {
    expect(lftHref({ role: "DUELIST", country: "France" })).toBe(
      "/lft?role=DUELIST&country=France"
    );
  });

  it("encode les valeurs", () => {
    expect(lftHref({ country: "Côte d'Ivoire" })).toContain("country=C%C3%B4te+d%27Ivoire");
  });
});
