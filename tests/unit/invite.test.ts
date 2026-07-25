import { describe, it, expect } from "vitest";
import { isInviteValid, isInviteTokenFormat } from "@/lib/invite";

const now = new Date("2026-07-25T12:00:00Z");
const future = new Date("2026-07-30T12:00:00Z");
const past = new Date("2026-07-20T12:00:00Z");

describe("isInviteValid", () => {
  it("valide si token présent et non expiré", () => {
    expect(isInviteValid({ inviteToken: "abc", inviteExpiresAt: future }, now)).toBe(true);
  });
  it("invalide si expiré", () => {
    expect(isInviteValid({ inviteToken: "abc", inviteExpiresAt: past }, now)).toBe(false);
  });
  it("invalide si expiration exactement égale à now (borne stricte)", () => {
    expect(isInviteValid({ inviteToken: "abc", inviteExpiresAt: now }, now)).toBe(false);
  });
  it("invalide si pas de token", () => {
    expect(isInviteValid({ inviteToken: null, inviteExpiresAt: future }, now)).toBe(false);
  });
  it("invalide si pas d'expiration", () => {
    expect(isInviteValid({ inviteToken: "abc", inviteExpiresAt: null }, now)).toBe(false);
  });
  it("invalide si team null", () => {
    expect(isInviteValid(null, now)).toBe(false);
  });
});

describe("isInviteTokenFormat", () => {
  it("accepte un token base64url de 32 caractères", () => {
    expect(isInviteTokenFormat("abcDEF012345678901234567890_-xyz")).toBe(true);
  });
  it("rejette une longueur incorrecte", () => {
    expect(isInviteTokenFormat("tooShort")).toBe(false);
    expect(isInviteTokenFormat("a".repeat(33))).toBe(false);
  });
  it("rejette les caractères hors base64url", () => {
    expect(isInviteTokenFormat("../../admin/aaaaaaaaaaaaaaaaaaaa")).toBe(false);
    expect(isInviteTokenFormat("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/")).toBe(false);
  });
  it("rejette les non-strings", () => {
    expect(isInviteTokenFormat(null)).toBe(false);
    expect(isInviteTokenFormat(undefined)).toBe(false);
    expect(isInviteTokenFormat(12345678901234567890123456789012)).toBe(false);
  });
});
