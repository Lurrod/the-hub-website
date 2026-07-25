import { describe, it, expect } from "vitest";
import { isInviteValid } from "@/lib/invite";

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
