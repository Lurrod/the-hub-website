import { describe, it, expect, beforeEach } from "vitest";
import { allow, consume, resetRateLimits, type RateLimitRule } from "@/lib/rate-limit";

const RULE: RateLimitRule = { limit: 3, windowMs: 1000 };

describe("consume", () => {
  it("autorise tant que la limite n'est pas atteinte", () => {
    let hits: number[] = [];
    for (let i = 0; i < RULE.limit; i++) {
      const v = consume(hits, RULE, 100 + i);
      expect(v.allowed).toBe(true);
      hits = v.hits;
    }
    expect(hits).toHaveLength(3);
  });

  it("refuse au-delà de la limite dans la fenêtre", () => {
    const v = consume([100, 200, 300], RULE, 400);
    expect(v.allowed).toBe(false);
    // Le plus ancien appel (100) sort de la fenêtre à 1100, soit dans 700 ms.
    expect(v.retryAfterMs).toBe(700);
  });

  it("oublie les appels sortis de la fenêtre", () => {
    const v = consume([100, 200, 300], RULE, 1500);
    expect(v.allowed).toBe(true);
    expect(v.hits).toEqual([1500]);
  });

  it("ne mute pas l'historique reçu", () => {
    const hits = [100];
    consume(hits, RULE, 200);
    expect(hits).toEqual([100]);
  });

  it("compte séparément un historique vide", () => {
    expect(consume([], RULE, 0).allowed).toBe(true);
  });
});

describe("allow", () => {
  beforeEach(resetRateLimits);

  it("laisse passer les premiers appels puis bloque", () => {
    const results = Array.from({ length: 4 }, () => allow("user-1", RULE));
    expect(results).toEqual([true, true, true, false]);
  });

  it("compte chaque clé indépendamment", () => {
    Array.from({ length: 3 }, () => allow("user-1", RULE));
    expect(allow("user-1", RULE)).toBe(false);
    expect(allow("user-2", RULE)).toBe(true);
  });
});
