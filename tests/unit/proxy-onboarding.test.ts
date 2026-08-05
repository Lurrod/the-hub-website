import { describe, it, expect } from "vitest";
import { isOnboardingExempt } from "@/proxy";

describe("isOnboardingExempt", () => {
  it("laisse passer les pages légales", () => {
    // Ce sont précisément les documents qu'on veut pouvoir lire AVANT de
    // terminer son inscription.
    for (const p of ["/cgu", "/confidentialite", "/mentions-legales"]) {
      expect(isOnboardingExempt(p)).toBe(true);
    }
  });

  it("laisse passer la page d'onboarding elle-même", () => {
    expect(isOnboardingExempt("/onboarding")).toBe(true);
  });

  it("retient tout le reste", () => {
    for (const p of ["/", "/tournois", "/profil", "/equipes/abc", "/cgu/extra"]) {
      expect(isOnboardingExempt(p)).toBe(false);
    }
  });
});
