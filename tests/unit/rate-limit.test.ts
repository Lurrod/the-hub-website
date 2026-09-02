import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
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

/**
 * Le magasin est partagé par des règles de fenêtres très différentes : 60 s
 * pour les images rendues à la volée et les dépôts d'image, 10 minutes pour la
 * vérification des Riot ID. Le balayage tranchait sur la fenêtre de la règle en
 * cours d'appel et non sur celle de la clé examinée : un appel porté par une
 * règle courte évinçait donc les compteurs d'une règle longue encore valides.
 *
 * Concrètement, le quota de 5 vérifications Riot par 10 minutes — la seule
 * raison d'être du module, protéger le quota de la clé HenrikDev — pouvait être
 * remis à zéro toutes les 60 secondes en faisant grossir le magasin au-delà du
 * seuil de balayage. Les clés `image:<ip>` sont créées à raison d'une par
 * adresse cliente : y parvenir ne demande qu'un flot distribué.
 */
describe("balayage du magasin", () => {
  const COURTE: RateLimitRule = { limit: 30, windowMs: 60_000 };
  const LONGUE: RateLimitRule = { limit: 2, windowMs: 600_000 };

  beforeEach(() => {
    resetRateLimits();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-02T12:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("n'évince pas une clé dont la fenêtre court encore", () => {
    expect(allow("riot:joueur", LONGUE)).toBe(true);
    expect(allow("riot:joueur", LONGUE)).toBe(true);
    expect(allow("riot:joueur", LONGUE)).toBe(false);

    // Une minute plus tard : la fenêtre courte est expirée, la longue non.
    vi.advanceTimersByTime(61_000);

    // Le magasin dépasse le seuil de balayage, sous une règle à fenêtre courte.
    for (let i = 0; i < 1_100; i++) allow(`image:10.0.${i >> 8}.${i & 255}`, COURTE);

    // Le quota de la règle longue n'a que 61 s : il doit tenir encore 9 minutes.
    expect(allow("riot:joueur", LONGUE)).toBe(false);
  });

  it("évince bien une clé dont la fenêtre est réellement expirée", () => {
    expect(allow("riot:joueur", LONGUE)).toBe(true);
    vi.advanceTimersByTime(601_000);
    for (let i = 0; i < 1_100; i++) allow(`image:10.1.${i >> 8}.${i & 255}`, COURTE);
    // La clé a disparu du magasin, et un nouvel appel repart d'un quota plein.
    expect(allow("riot:joueur", LONGUE)).toBe(true);
    expect(allow("riot:joueur", LONGUE)).toBe(true);
    expect(allow("riot:joueur", LONGUE)).toBe(false);
  });
});
