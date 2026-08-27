import { describe, it, expect, vi, afterEach } from "vitest";
import { agentIcons } from "@/lib/og/agent-icon";

/*
 * Le chemin nominal est couvert depuis que les icônes sont rapatriées dans
 * `public/` : la suite lit le vrai fichier, sans sortir du processus. Avant,
 * elle aurait dépendu de media.valorant-api.com, donc d'un CDN tiers.
 */

afterEach(() => {
  vi.restoreAllMocks();
});

describe("agentIcons", () => {
  it("rend l'icône d'un agent connu en data URI PNG", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const icons = await agentIcons(["Jett"]);

    expect(icons.get("Jett")).toMatch(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/);
    // Satori n'ira pas chercher d'image distante : si un fetch partait d'ici,
    // c'est que le rapatriement dans public/ a été contourné.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

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
