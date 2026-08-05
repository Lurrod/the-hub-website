import { describe, it, expect } from "vitest";
import {
  MANAGER_ROLES,
  MANAGER_ROLE_LABELS,
  MANAGER_ROLE_HINTS,
  parseManagerRole,
} from "@/lib/manager-roles";

describe("parseManagerRole", () => {
  it("reconnaît les deux niveaux", () => {
    expect(parseManagerRole("OWNER")).toBe("OWNER");
    expect(parseManagerRole("MANAGER")).toBe("MANAGER");
  });

  it("retombe sur le niveau le plus bas pour toute valeur inattendue", () => {
    // Fail-closed : un champ absent ou trafiqué ne doit jamais accorder plus
    // de droits que prévu.
    for (const v of [undefined, null, "", "owner", "ADMIN", 1, {}, ["OWNER"]]) {
      expect(parseManagerRole(v)).toBe("MANAGER");
    }
  });
});

describe("libellés", () => {
  it("couvre chaque niveau", () => {
    for (const r of MANAGER_ROLES) {
      expect(MANAGER_ROLE_LABELS[r]).toBeTruthy();
      expect(MANAGER_ROLE_HINTS[r]).toBeTruthy();
    }
  });
});
