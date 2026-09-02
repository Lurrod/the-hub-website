import { describe, it, expect } from "vitest";
import { checkEnv } from "@/lib/env-core";

const COMPLET = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/thehub",
  AUTH_SECRET: "un-secret-de-session",
  AUTH_DISCORD_ID: "123456789",
  AUTH_DISCORD_SECRET: "un-secret-discord",
  HENRIKDEV_API_KEY: "HDEV-xxxx",
  PREMIER_SYNC_SECRET: "0123456789abcdef",
  NEXT_PUBLIC_BASE_URL: "https://the-hub-vrc.fr",
};

describe("checkEnv", () => {
  it("accepte un environnement complet, en développement comme en production", () => {
    expect(checkEnv(COMPLET, false).ok).toBe(true);
    expect(checkEnv(COMPLET, true).ok).toBe(true);
  });

  it("refuse une variable absolument requise, quel que soit l'environnement", () => {
    const sansSecret = { ...COMPLET, AUTH_SECRET: undefined };
    for (const production of [false, true]) {
      const v = checkEnv(sansSecret, production);
      expect(v.ok).toBe(false);
      if (!v.ok) expect(v.manquantes).toContain("AUTH_SECRET");
    }
  });

  // Le cas qui a produit l'incident du 2026-08-31 : la variable existe dans le
  // fichier .env mais sa valeur est vide. Tout contrôle de simple présence la
  // laisse passer, et la panne n'apparaît qu'au premier appel HenrikDev.
  it("traite une chaîne vide ou blanche comme une variable absente", () => {
    for (const vide of ["", "   ", "\t"]) {
      const v = checkEnv({ ...COMPLET, HENRIKDEV_API_KEY: vide }, true);
      expect(v.ok).toBe(false);
      if (!v.ok) expect(v.manquantes).toContain("HENRIKDEV_API_KEY");
    }
  });

  it("ne réclame les clés d'intégration qu'en production", () => {
    const sansIntegrations = {
      DATABASE_URL: COMPLET.DATABASE_URL,
      AUTH_SECRET: COMPLET.AUTH_SECRET,
      AUTH_DISCORD_ID: COMPLET.AUTH_DISCORD_ID,
      AUTH_DISCORD_SECRET: COMPLET.AUTH_DISCORD_SECRET,
    };
    expect(checkEnv(sansIntegrations, false).ok).toBe(true);

    const v = checkEnv(sansIntegrations, true);
    expect(v.ok).toBe(false);
    if (!v.ok) {
      expect(v.manquantes).toEqual(
        expect.arrayContaining(["HENRIKDEV_API_KEY", "PREMIER_SYNC_SECRET", "NEXT_PUBLIC_BASE_URL"])
      );
    }
  });

  it("refuse une URL de base qui n'en est pas une", () => {
    const v = checkEnv({ ...COMPLET, NEXT_PUBLIC_BASE_URL: "localhost:3200" }, true);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.manquantes).toContain("NEXT_PUBLIC_BASE_URL");
  });

  it("nomme chaque variable fautive dans le message", () => {
    const v = checkEnv({}, true);
    expect(v.ok).toBe(false);
    if (!v.ok) {
      expect(v.message).toContain("DATABASE_URL");
      expect(v.message).toContain("HENRIKDEV_API_KEY");
      expect(v.message).toContain(".env.example");
    }
  });
});
