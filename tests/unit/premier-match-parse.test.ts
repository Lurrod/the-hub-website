import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import raw from "./fixtures/premier-match.json";
import { getCustomMatchById } from "@/lib/henrikdev";

/**
 * Un match Premier est une partie de file d'attente, pas une partie
 * personnalisée : rien ne garantissait a priori que le parseur écrit pour les
 * secondes lise correctement la première. Ce test passe une capture réelle
 * (saison 18, `EU_FRANCE` division 21) dans le chemin complet, `fetch` simulé,
 * plutôt que d'inspecter le JSON brut — c'est le parseur qu'on veut vérifier,
 * pas la forme de la réponse.
 */
describe("un match Premier traverse le parseur des parties personnalisées", () => {
  beforeEach(() => {
    vi.stubEnv("HENRIKDEV_API_KEY", "cle-de-test");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(raw), { status: 200 }))
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("rend les dix joueurs avec leurs statistiques", async () => {
    const m = await getCustomMatchById("eu", "4def23a7-9631-42ac-a713-8c0e7de05149");
    expect(m.players).toHaveLength(10);
    expect(m.players.every((p) => p.puuid.length > 0)).toBe(true);
    // Une ligne de statistiques entièrement nulle trahirait un champ déplacé.
    expect(m.players.some((p) => p.kills > 0 && p.damageMade > 0)).toBe(true);
  });

  it("rend les rounds et les duels", async () => {
    const m = await getCustomMatchById("eu", "4def23a7-9631-42ac-a713-8c0e7de05149");
    expect(m.rounds).toHaveLength(22);
    expect(m.kills.length).toBeGreaterThan(100);
    expect(m.rounds.every((r) => r.winningTeamId.length > 0)).toBe(true);
  });

  it("départage les camps sur le score de rounds", async () => {
    const m = await getCustomMatchById("eu", "4def23a7-9631-42ac-a713-8c0e7de05149");
    expect(m.teamRounds).toEqual({ Red: 9, Blue: 13 });
  });

  it("rend la carte et la date de début", async () => {
    const m = await getCustomMatchById("eu", "4def23a7-9631-42ac-a713-8c0e7de05149");
    expect(m.map.length).toBeGreaterThan(0);
    expect(m.startedAt).toBe("2026-05-14T17:05:32.448Z");
  });
});
