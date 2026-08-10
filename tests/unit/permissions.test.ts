import { describe, it, expect } from "vitest";
import {
  isAdmin,
  canManageTeam,
  canManageTournament,
  canAdminister,
  managerUserIds,
  isLastOwner,
} from "@/lib/permissions";

const admin = { id: "u1", globalRole: "ADMIN" as const };
const user = { id: "u2", globalRole: "USER" as const };

describe("isAdmin", () => {
  it("vrai pour un admin", () => expect(isAdmin(admin)).toBe(true));
  it("faux pour un user", () => expect(isAdmin(user)).toBe(false));
  it("faux pour null", () => expect(isAdmin(null)).toBe(false));
});

describe("canManageTeam", () => {
  it("admin peut toujours", () => expect(canManageTeam(admin, ["u9"])).toBe(true));
  it("manager de l'équipe peut", () => expect(canManageTeam(user, ["u2", "u3"])).toBe(true));
  it("non-manager ne peut pas", () => expect(canManageTeam(user, ["u3"])).toBe(false));
  it("null ne peut pas", () => expect(canManageTeam(null, ["u2"])).toBe(false));
});

describe("canManageTournament", () => {
  it("admin peut toujours", () => expect(canManageTournament(admin, ["u9"])).toBe(true));
  it("manager du tournoi peut", () => expect(canManageTournament(user, ["u2"])).toBe(true));
  it("non-manager ne peut pas", () => expect(canManageTournament(user, ["u3"])).toBe(false));
});

const owner = { userId: "u2", role: "OWNER" as const };
const simple = { userId: "u4", role: "MANAGER" as const };

describe("canAdminister", () => {
  it("admin peut toujours", () => expect(canAdminister(admin, [simple])).toBe(true));
  it("propriétaire peut", () => expect(canAdminister(user, [owner, simple])).toBe(true));
  it("simple manager ne peut pas", () =>
    expect(canAdminister({ id: "u4", globalRole: "USER" }, [owner, simple])).toBe(false));
  it("étranger ne peut pas", () => expect(canAdminister(user, [simple])).toBe(false));
  it("null ne peut pas", () => expect(canAdminister(null, [owner])).toBe(false));
  it("liste vide : personne sauf admin", () => {
    expect(canAdminister(user, [])).toBe(false);
    expect(canAdminister(admin, [])).toBe(true);
  });
});

describe("managerUserIds", () => {
  it("aplatit les deux niveaux", () =>
    expect(managerUserIds([owner, simple])).toEqual(["u2", "u4"]));
  it("gère la liste vide", () => expect(managerUserIds([])).toEqual([]));
});

describe("isLastOwner", () => {
  it("vrai pour l'unique propriétaire", () =>
    expect(isLastOwner([owner, simple], "u2")).toBe(true));
  it("faux quand un autre propriétaire subsiste", () =>
    expect(isLastOwner([owner, { userId: "u5", role: "OWNER" }], "u2")).toBe(false));
  it("faux pour un simple manager", () => expect(isLastOwner([owner, simple], "u4")).toBe(false));
  it("faux sans aucun propriétaire", () => expect(isLastOwner([simple], "u4")).toBe(false));
});
