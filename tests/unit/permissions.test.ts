import { describe, it, expect } from "vitest";
import { isAdmin, canManageTeam, canManageTournament } from "@/lib/permissions";

const admin = { id: "u1", globalRole: "ADMIN" as const };
const user = { id: "u2", globalRole: "USER" as const };

describe("isAdmin", () => {
  it("vrai pour un admin", () => expect(isAdmin(admin)).toBe(true));
  it("faux pour un user", () => expect(isAdmin(user)).toBe(false));
  it("faux pour null", () => expect(isAdmin(null)).toBe(false));
});

describe("canManageTeam", () => {
  it("admin peut toujours", () =>
    expect(canManageTeam(admin, ["u9"])).toBe(true));
  it("manager de l'équipe peut", () =>
    expect(canManageTeam(user, ["u2", "u3"])).toBe(true));
  it("non-manager ne peut pas", () =>
    expect(canManageTeam(user, ["u3"])).toBe(false));
  it("null ne peut pas", () =>
    expect(canManageTeam(null, ["u2"])).toBe(false));
});

describe("canManageTournament", () => {
  it("admin peut toujours", () =>
    expect(canManageTournament(admin, ["u9"])).toBe(true));
  it("manager du tournoi peut", () =>
    expect(canManageTournament(user, ["u2"])).toBe(true));
  it("non-manager ne peut pas", () =>
    expect(canManageTournament(user, ["u3"])).toBe(false));
});
