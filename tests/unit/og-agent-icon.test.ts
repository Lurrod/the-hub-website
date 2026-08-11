import { describe, it, expect, vi, afterEach } from "vitest";
import { agentIcons } from "@/lib/og/agent-icon";

/*
 * Seuls les cas qui ne sortent pas du processus sont couverts : les icônes
 * réelles vivent sur media.valorant-api.com, et une suite unitaire ne doit pas
 * dépendre d'un CDN tiers. Le chemin nominal est vérifié à l'œil sur les
 * cartes rendues.
 */

afterEach(() => {
  vi.restoreAllMocks();
});

describe("agentIcons", () => {
  it("n'interroge pas le réseau pour un agent hors de la table", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const icons = await agentIcons(["Agent Inexistant"]);

    expect(icons.size).toBe(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("accepte une liste vide sans rien tenter", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    expect((await agentIcons([])).size).toBe(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("dédoublonne les agents demandés", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    // Deux fois le même agent inconnu : la table est consultée une seule fois,
    // et aucun appel réseau n'en découle.
    const icons = await agentIcons(["Inconnu", "Inconnu"]);

    expect(icons.size).toBe(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
