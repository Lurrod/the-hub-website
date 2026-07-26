import { describe, it, expect, vi, afterEach } from "vitest";
import { getPlayerCustomMatches } from "@/lib/henrikdev";

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    status, ok: status >= 200 && status < 300, json: async () => body,
  } as Response);
}
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

const rawMatch = {
  metadata: { match_id: "m1", map: { name: "Ascent" }, started_at: "2026-07-27T20:00:00Z" },
  teams: [
    { team_id: "Red", rounds: { won: 13, lost: 9 } },
    { team_id: "Blue", rounds: { won: 9, lost: 13 } },
  ],
  players: [
    {
      puuid: "p1", name: "Zed", tag: "EUW", team_id: "Red", agent: { name: "Jett" },
      stats: { kills: 20, deaths: 12, assists: 5, score: 4400, headshots: 30, bodyshots: 60, legshots: 10, damage: { dealt: 3300 } },
    },
  ],
};

describe("getPlayerCustomMatches", () => {
  it("mappe la réponse v4 vers CustomMatch normalisé", async () => {
    vi.stubEnv("HENRIKDEV_API_KEY", "k");
    vi.stubGlobal("fetch", mockFetch(200, { data: [rawMatch] }));
    const out = await getPlayerCustomMatches("eu", "Zed", "EUW");
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      matchId: "m1", map: "Ascent", startedAt: "2026-07-27T20:00:00Z",
      teamRounds: { Red: 13, Blue: 9 },
    });
    expect(out[0].players[0]).toMatchObject({
      puuid: "p1", teamId: "Red", agent: "Jett", kills: 20, deaths: 12, assists: 5,
      score: 4400, headshots: 30, bodyshots: 60, legshots: 10, damageMade: 3300, firstKills: 0,
    });
  });
  it("retourne [] si data absent", async () => {
    vi.stubEnv("HENRIKDEV_API_KEY", "k");
    vi.stubGlobal("fetch", mockFetch(200, {}));
    expect(await getPlayerCustomMatches("eu", "x", "yyy")).toEqual([]);
  });
  it("429 -> RATE_LIMITED", async () => {
    vi.stubEnv("HENRIKDEV_API_KEY", "k");
    vi.stubGlobal("fetch", mockFetch(429, {}));
    await expect(getPlayerCustomMatches("eu", "x", "yyy")).rejects.toMatchObject({ code: "RATE_LIMITED" });
  });
});
