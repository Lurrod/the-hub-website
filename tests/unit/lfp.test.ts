import { describe, it, expect } from "vitest";
import {
  LFP_MESSAGE_MAX,
  hasActiveLfpFilter,
  lfpHref,
  lfpRolesLabel,
  nextLfpState,
  normalizeLfpMessage,
  normalizeLfpRole,
  normalizeLfpSearch,
  normalizeLftView,
  parseLfpRoles,
} from "@/lib/lfp";

const NOW = new Date("2026-08-05T12:00:00.000Z");

describe("nextLfpState", () => {
  it("allume l'annonce avec ses postes et son message", () => {
    const s = nextLfpState(false, { roles: ["SENTINEL", "DUELIST"], message: " On recrute " }, NOW);
    expect(s.lfp).toBe(true);
    expect(s.lfpSince).toEqual(NOW);
    expect(s.lfpRoles).toEqual(["DUELIST", "SENTINEL"]);
    expect(s.lfpMessage).toBe("On recrute");
  });

  it("éteindre efface postes, message et ancienneté", () => {
    // Sinon une demande périmée réapparaîtrait au prochain rallumage.
    const s = nextLfpState(true, { roles: ["DUELIST"], message: "x" }, NOW);
    expect(s).toEqual({ lfp: false, lfpSince: null, lfpRoles: [], lfpMessage: null });
  });

  it("s'allume sans poste ni message", () => {
    const s = nextLfpState(false, {}, NOW);
    expect(s.lfp).toBe(true);
    expect(s.lfpRoles).toEqual([]);
    expect(s.lfpMessage).toBeNull();
  });
});

describe("parseLfpRoles", () => {
  it("écarte les valeurs inconnues et les doublons", () => {
    expect(parseLfpRoles(["DUELIST", "PIRATE", "DUELIST"])).toEqual(["DUELIST"]);
  });

  it("range dans l'ordre canonique, pas celui de la soumission", () => {
    expect(parseLfpRoles(["SENTINEL", "DUELIST"])).toEqual(["DUELIST", "SENTINEL"]);
  });

  it("rend une liste vide sans entrée", () => {
    expect(parseLfpRoles(undefined)).toEqual([]);
    expect(parseLfpRoles([])).toEqual([]);
  });
});

describe("normalizeLfpMessage", () => {
  it("coupe et borne", () => {
    expect(normalizeLfpMessage("  salut  ")).toBe("salut");
    expect(normalizeLfpMessage("x".repeat(500))).toHaveLength(LFP_MESSAGE_MAX);
  });

  it("rend null quand il n'y a rien à dire", () => {
    expect(normalizeLfpMessage("   ")).toBeNull();
    expect(normalizeLfpMessage(undefined)).toBeNull();
  });
});

describe("lfpRolesLabel", () => {
  const labels = { DUELIST: "Duelliste", SENTINEL: "Sentinelle" };

  it("liste les postes recherchés", () => {
    expect(lfpRolesLabel(["DUELIST", "SENTINEL"], labels)).toBe("Duelliste, Sentinelle");
  });

  it("une liste vide veut dire « ouvert à tous »", () => {
    expect(lfpRolesLabel([], labels)).toBe("Tous les postes");
  });
});

describe("onglets et filtres", () => {
  it("retombe sur l'onglet joueurs par défaut", () => {
    for (const v of [undefined, "", "lft", "autre"]) expect(normalizeLftView(v)).toBe("lft");
    expect(normalizeLftView("lfp")).toBe("lfp");
  });

  it("ne garde qu'un rôle connu", () => {
    expect(normalizeLfpRole("CONTROLLER")).toBe("CONTROLLER");
    expect(normalizeLfpRole("TANK")).toBeUndefined();
  });

  it("borne la recherche", () => {
    expect(normalizeLfpSearch(" fnc ")).toBe("fnc");
    expect(normalizeLfpSearch("  ")).toBeUndefined();
  });

  it("le lien porte toujours la vue, pour rester partageable", () => {
    expect(lfpHref({})).toBe("/lft?vue=lfp");
    expect(lfpHref({ role: "DUELIST", q: "fnc" })).toBe("/lft?vue=lfp&role=DUELIST&q=fnc");
  });

  it("détecte un filtre actif", () => {
    expect(hasActiveLfpFilter({})).toBe(false);
    expect(hasActiveLfpFilter({ role: "DUELIST" })).toBe(true);
  });
});
