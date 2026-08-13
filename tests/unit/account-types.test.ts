import { describe, it, expect } from "vitest";
import {
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_LABELS,
  hasValorantRole,
  parseAccountType,
  requiresRiotId,
} from "@/lib/account-types";

describe("parseAccountType", () => {
  it("accepte les trois types", () => {
    for (const type of ACCOUNT_TYPES) {
      expect(parseAccountType(type)).toBe(type);
    }
  });

  it("retombe sur joueur devant une valeur inattendue", () => {
    // Un champ absent ou trafiqué ne doit pas permettre de sauter la liaison
    // du Riot ID : le repli est le cas le plus exigeant.
    for (const valeur of [undefined, null, "", "ADMIN", "joueur", 0, {}, ["COACH"]]) {
      expect(parseAccountType(valeur)).toBe("JOUEUR");
    }
  });
});

describe("requiresRiotId", () => {
  it("n'exige le Riot ID que du joueur", () => {
    expect(requiresRiotId("JOUEUR")).toBe(true);
    expect(requiresRiotId("COACH")).toBe(false);
    expect(requiresRiotId("MANAGER")).toBe(false);
  });
});

describe("hasValorantRole", () => {
  it("ne propose le rôle Valorant qu'au joueur", () => {
    expect(hasValorantRole("JOUEUR")).toBe(true);
    expect(hasValorantRole("COACH")).toBe(false);
    expect(hasValorantRole("MANAGER")).toBe(false);
  });
});

describe("libellés", () => {
  it("couvre les trois types, sans trou", () => {
    for (const type of ACCOUNT_TYPES) {
      expect(ACCOUNT_TYPE_LABELS[type]).toBeTruthy();
    }
  });
});
