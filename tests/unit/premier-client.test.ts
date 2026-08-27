import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getPremierLeaderboard,
  getPremierSeasons,
  getPremierTeam,
  getPremierHistory,
  RiotIdError,
} from "@/lib/henrikdev";

/**
 * Les quatre appels Premier du client, vus depuis leurs cas limites.
 *
 * Le chemin nominal est déjà couvert par les essais réels ; ce qui se teste
 * mal en conditions réelles, c'est ce que fait le client quand l'API répond
 * autrement que prévu — enveloppe vide, quota dépassé, ressource absente.
 */

type Reponse = { status?: number; body?: unknown; headers?: Record<string, string> };

function repond({ status = 200, body = {}, headers = {} }: Reponse) {
  return vi.fn(async (url: string | URL | Request): Promise<Response> => {
    void url;
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json", ...headers },
    });
  });
}

describe("appels Premier du client HenrikDev", () => {
  beforeEach(() => vi.stubEnv("HENRIKDEV_API_KEY", "cle-de-test"));
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("filtre le classement par segments de chemin, pas par paramètres", async () => {
    const f = repond({
      body: {
        data: [{ id: "u1", name: "X", tag: "XX", conference: "EU_FRANCE", division: 21 }],
      },
    });
    vi.stubGlobal("fetch", f);

    const r = await getPremierLeaderboard("EU_FRANCE", 21);
    expect(r).toHaveLength(1);
    const url = String(f.mock.calls[0][0]);
    // La variante documentée `?conference=&division=` est ignorée par le
    // serveur, qui renvoie alors toute l'Europe.
    expect(url).toContain("/premier/leaderboard/eu/EU_FRANCE/21");
    expect(url).not.toContain("?conference=");
  });

  it("rend une liste vide quand l'enveloppe n'a pas de données", async () => {
    vi.stubGlobal("fetch", repond({ body: {} }));
    await expect(getPremierLeaderboard("EU_FRANCE", 21)).resolves.toEqual([]);
  });

  it("rend un historique vide quand l'enveloppe n'a pas de données", async () => {
    vi.stubGlobal("fetch", repond({ body: {} }));
    await expect(getPremierHistory("u1")).resolves.toEqual({
      league_matches: [],
      tournament_matches: [],
    });
  });

  it("rend une liste de saisons vide quand l'enveloppe n'a pas de données", async () => {
    vi.stubGlobal("fetch", repond({ body: {} }));
    await expect(getPremierSeasons("eu")).resolves.toEqual([]);
  });

  it("traduit un 429 en RATE_LIMITED", async () => {
    vi.stubGlobal("fetch", repond({ status: 429, body: {} }));
    await expect(getPremierHistory("u1")).rejects.toMatchObject({ code: "RATE_LIMITED" });
  });

  it("traduit un 404 en NOT_FOUND", async () => {
    vi.stubGlobal("fetch", repond({ status: 404, body: {} }));
    await expect(getPremierTeam("inconnue")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("refuse d'appeler sans clé d'API", async () => {
    vi.stubEnv("HENRIKDEV_API_KEY", "");
    const f = repond({ body: { data: [] } });
    vi.stubGlobal("fetch", f);
    await expect(getPremierSeasons("eu")).rejects.toBeInstanceOf(RiotIdError);
    expect(f).not.toHaveBeenCalled();
  });

  it("lève plutôt que d'accepter une réponse qui ne respecte pas le schéma", async () => {
    // Une ligne trouée en base coûterait plus cher qu'un passage échoué.
    vi.stubGlobal("fetch", repond({ body: { data: [{ name: "sans identifiant" }] } }));
    await expect(getPremierLeaderboard("EU_FRANCE", 21)).rejects.toBeDefined();
  });

  it("encode les identifiants dans le chemin", async () => {
    const f = repond({ body: { data: { id: "u", name: "X", tag: "T" } } });
    vi.stubGlobal("fetch", f);
    await getPremierTeam("a/b");
    expect(String(f.mock.calls[0][0])).toContain("a%2Fb");
  });
});
