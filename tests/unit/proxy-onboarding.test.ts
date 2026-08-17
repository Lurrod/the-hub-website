import { describe, it, expect } from "vitest";
import { isOnboardingExempt, stripWwwUrl } from "@/proxy";

describe("stripWwwUrl", () => {
  it("redirige www vers l'apex en conservant chemin et query", () => {
    const out = stripWwwUrl(new URL("https://www.the-hub-vrc.fr/tournois/abc?tab=stats"));
    expect(out?.toString()).toBe("https://the-hub-vrc.fr/tournois/abc?tab=stats");
  });

  it("ne touche pas l'apex ni localhost", () => {
    expect(stripWwwUrl(new URL("https://the-hub-vrc.fr/"))).toBeNull();
    expect(stripWwwUrl(new URL("http://localhost:3200/"))).toBeNull();
  });

  it("ne confond pas un domaine qui commence par www sans point", () => {
    expect(stripWwwUrl(new URL("https://wwwtruc.fr/"))).toBeNull();
  });
});

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
