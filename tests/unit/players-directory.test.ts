import { describe, it, expect } from "vitest";
import {
  DEFAULT_PLAYER_SORT,
  directoryHref,
  directoryParams,
  hasActiveDirectoryFilter,
  killDeathRatio,
  normalizePlayerRole,
  normalizePlayerSearch,
  normalizePlayerSort,
  normalizePlayerTeamFilter,
} from "@/lib/players-directory";

describe("normalizePlayerSort", () => {
  it("accepte les colonnes connues", () => {
    for (const k of ["rating", "acs", "maps", "pseudo"]) {
      expect(normalizePlayerSort(k)).toBe(k);
    }
  });

  it("retombe sur le tri par défaut", () => {
    for (const k of [undefined, "", "kills", "DROP TABLE"]) {
      expect(normalizePlayerSort(k)).toBe(DEFAULT_PLAYER_SORT);
    }
  });
});

describe("normalisation des filtres", () => {
  it("ne garde qu'un rôle Valorant connu", () => {
    expect(normalizePlayerRole("DUELIST")).toBe("DUELIST");
    expect(normalizePlayerRole("SUPPORT")).toBeUndefined();
    expect(normalizePlayerRole(undefined)).toBeUndefined();
  });

  it("ne garde qu'un statut d'équipe connu", () => {
    expect(normalizePlayerTeamFilter("free")).toBe("free");
    expect(normalizePlayerTeamFilter("libre")).toBeUndefined();
  });

  it("borne et nettoie la recherche", () => {
    expect(normalizePlayerSearch("  aim  ")).toBe("aim");
    expect(normalizePlayerSearch("   ")).toBeUndefined();
    expect(normalizePlayerSearch("x".repeat(80))).toHaveLength(40);
  });
});

describe("directoryParams / directoryHref", () => {
  const base = { sort: DEFAULT_PLAYER_SORT } as const;

  it("laisse l'URL nue quand rien n'est filtré", () => {
    expect(directoryHref(base)).toBe("/joueurs");
  });

  it("omet le tri par défaut de l'URL", () => {
    expect(directoryParams(base).sort).toBeUndefined();
    expect(directoryHref({ ...base, sort: "acs" })).toBe("/joueurs?sort=acs");
  });

  it("conserve les filtres actifs", () => {
    expect(directoryHref({ role: "SENTINEL", team: "free", q: "aim", sort: "maps" })).toBe(
      "/joueurs?role=SENTINEL&team=free&q=aim&sort=maps"
    );
  });
});

describe("hasActiveDirectoryFilter", () => {
  it("est faux sur l'état par défaut", () => {
    expect(hasActiveDirectoryFilter({ sort: DEFAULT_PLAYER_SORT })).toBe(false);
  });

  it("est vrai dès qu'un filtre ou un tri non standard est posé", () => {
    expect(hasActiveDirectoryFilter({ sort: "acs" })).toBe(true);
    expect(hasActiveDirectoryFilter({ role: "DUELIST", sort: DEFAULT_PLAYER_SORT })).toBe(true);
    expect(hasActiveDirectoryFilter({ q: "a", sort: DEFAULT_PLAYER_SORT })).toBe(true);
  });
});

describe("killDeathRatio", () => {
  it("arrondit au centième", () => {
    expect(killDeathRatio(100, 80)).toBe(1.25);
    expect(killDeathRatio(7, 3)).toBe(2.33);
  });

  it("ne divise pas par zéro", () => {
    expect(killDeathRatio(5, 0)).toBe(5);
    expect(killDeathRatio(0, 0)).toBe(0);
  });
});
