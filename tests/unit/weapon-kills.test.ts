import { describe, it, expect } from "vitest";
import { computeWeaponKills } from "@/lib/match-stats-core";
import { weaponIconUrl, weaponLabel } from "@/lib/weapons";
import type { CustomMatchKill } from "@/lib/henrikdev";

const kill = (killerPuuid: string, weapon: string | null): CustomMatchKill => ({
  round: 0,
  timeInRoundMs: 1000,
  killerPuuid,
  victimPuuid: "victime",
  assistantPuuids: [],
  weapon,
});

describe("computeWeaponKills", () => {
  it("compte les kills par arme et par joueur", () => {
    const out = computeWeaponKills(
      [kill("a1", "Vandal"), kill("a1", "Vandal"), kill("a1", "Operator"), kill("a2", "Phantom")],
      ["a1", "a2", "a3"]
    );
    expect(out.get("a1")).toEqual({ Vandal: 2, Operator: 1 });
    expect(out.get("a2")).toEqual({ Phantom: 1 });
    expect(out.get("a3")).toEqual({});
  });

  it("ignore les kills sans arme (capacités) et les tueurs hors roster", () => {
    const out = computeWeaponKills([kill("a1", null), kill("fantome", "Vandal")], ["a1"]);
    expect(out.get("a1")).toEqual({});
    expect(out.has("fantome")).toBe(false);
  });
});

describe("weapons", () => {
  it("fournit une icône pour les armes connues, rien pour l'inconnu", () => {
    expect(weaponIconUrl("Vandal")).toMatch(/^https:\/\/media\.valorant-api\.com\/weapons\//);
    expect(weaponIconUrl("Fusil imaginaire")).toBeNull();
    expect(weaponIconUrl(null)).toBeNull();
  });

  it("traduit Melee en Couteau et laisse les autres noms tels quels", () => {
    expect(weaponLabel("Melee")).toBe("Couteau");
    expect(weaponLabel("Vandal")).toBe("Vandal");
  });
});
