import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const warn = vi.fn();
vi.mock("@/lib/logger", () => ({ logger: { warn, error: vi.fn(), info: vi.fn() } }));

const { assertEnv } = await import("@/lib/env");

const COMPLET: Record<string, string> = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/thehub",
  AUTH_SECRET: "un-secret-de-session",
  AUTH_DISCORD_ID: "123456789",
  AUTH_DISCORD_SECRET: "un-secret-discord",
  HENRIKDEV_API_KEY: "HDEV-xxxx",
  PREMIER_SYNC_SECRET: "0123456789abcdef",
  NEXT_PUBLIC_BASE_URL: "https://the-hub-vrc.fr",
};

const CLES = [...Object.keys(COMPLET), "NODE_ENV", "CI"];
const sauvegarde: Record<string, string | undefined> = {};

/** Pose l'environnement décrit, en effaçant toute valeur héritée du shell. */
function poser(env: Record<string, string | undefined>) {
  for (const k of CLES) delete process.env[k];
  for (const [k, v] of Object.entries(env)) if (v !== undefined) process.env[k] = v;
}

beforeEach(() => {
  warn.mockClear();
  for (const k of CLES) sauvegarde[k] = process.env[k];
});

afterEach(() => {
  for (const k of CLES) {
    if (sauvegarde[k] === undefined) delete process.env[k];
    else process.env[k] = sauvegarde[k];
  }
});

describe("assertEnv", () => {
  it("ne dit rien quand tout est en place", () => {
    poser({ ...COMPLET, NODE_ENV: "production" });
    expect(() => assertEnv()).not.toThrow();
    expect(warn).not.toHaveBeenCalled();
  });

  // Mieux vaut un serveur qui refuse de démarrer en nommant la variable fautive
  // qu'un site en ligne dont la vérification des Riot ID échoue en silence
  // pendant deux semaines — ce qui s'est produit le 2026-08-31.
  it("lève en déploiement, en nommant ce qui manque", () => {
    poser({ ...COMPLET, HENRIKDEV_API_KEY: undefined, NODE_ENV: "production" });
    expect(() => assertEnv()).toThrowError(/HENRIKDEV_API_KEY/);
  });

  // En développement on doit pouvoir travailler la mise en page sans clé
  // HenrikDev : c'est une variable requise en production seulement, son absence
  // ne déclenche donc rien ici. Ce qui manque ci-dessous est requis partout.
  it("se contente d'avertir en développement", () => {
    poser({ ...COMPLET, AUTH_SECRET: undefined, NODE_ENV: "development" });
    expect(() => assertEnv()).not.toThrow();
    expect(warn).toHaveBeenCalledWith("env.incomplet", { manquantes: "AUTH_SECRET" });
  });

  it("ne réclame pas les clés d'intégration hors production", () => {
    poser({ ...COMPLET, HENRIKDEV_API_KEY: undefined, NODE_ENV: "development" });
    expect(() => assertEnv()).not.toThrow();
    expect(warn).not.toHaveBeenCalled();
  });

  // Le banc d'essai de la CI sert le build de production sans application
  // Discord ni clé HenrikDev : exiger le jeu complet l'a réellement cassé.
  it("n'exige rien de plus du banc d'essai de la CI", () => {
    poser({ ...COMPLET, HENRIKDEV_API_KEY: undefined, NODE_ENV: "production", CI: "true" });
    expect(() => assertEnv()).not.toThrow();
    // Ni levée, ni même avertissement : sous CI la clé n'est pas attendue.
    expect(warn).not.toHaveBeenCalled();
  });
});
