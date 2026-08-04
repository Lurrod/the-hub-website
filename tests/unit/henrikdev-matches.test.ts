import { describe, it, expect, vi, afterEach } from "vitest";
import { getCustomMatchById, getPlayerCustomMatches } from "@/lib/henrikdev";

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
  rounds: [
    { winning_team: "Red", result: "Elimination" },
    { winning_team: "Blue", result: "Detonate" },
    { winning_team: "Red", result: "Defuse" },
    { winning_team: "Blue", result: "Round timer expired" },
  ],
  kills: [
    {
      round: 0, time_in_round_in_ms: 9000,
      killer: { puuid: "p1" }, victim: { puuid: "p2" }, assistants: [{ puuid: "p3" }],
    },
    { round: 0, time_in_round_in_ms: 4000, killer: { puuid: "p2" }, victim: { puuid: "p4" }, assistants: [] },
    { round: 1, time_in_round_in_ms: 5000, killer: { puuid: "p1" }, victim: {}, assistants: [] },
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
      score: 4400, headshots: 30, bodyshots: 60, legshots: 10, damageMade: 3300,
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

describe("getCustomMatchById", () => {
  it("mappe une partie unique renvoyée en objet", async () => {
    vi.stubEnv("HENRIKDEV_API_KEY", "k");
    const fetchMock = mockFetch(200, { data: rawMatch });
    vi.stubGlobal("fetch", fetchMock);
    const out = await getCustomMatchById("eu", "0e3a1f2b-1111-2222-3333-444455556666");
    expect(out).toMatchObject({ matchId: "m1", map: "Ascent", teamRounds: { Red: 13, Blue: 9 } });
    expect(out.players).toHaveLength(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      "/valorant/v4/match/eu/0e3a1f2b-1111-2222-3333-444455556666"
    );
  });
  it("accepte aussi une réponse enveloppée dans un tableau", async () => {
    vi.stubEnv("HENRIKDEV_API_KEY", "k");
    vi.stubGlobal("fetch", mockFetch(200, { data: [rawMatch] }));
    expect((await getCustomMatchById("eu", "m1")).matchId).toBe("m1");
  });
  it("404 -> NOT_FOUND", async () => {
    vi.stubEnv("HENRIKDEV_API_KEY", "k");
    vi.stubGlobal("fetch", mockFetch(404, {}));
    await expect(getCustomMatchById("eu", "m1")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("data absent -> NOT_FOUND", async () => {
    vi.stubEnv("HENRIKDEV_API_KEY", "k");
    vi.stubGlobal("fetch", mockFetch(200, {}));
    await expect(getCustomMatchById("eu", "m1")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("429 -> RATE_LIMITED", async () => {
    vi.stubEnv("HENRIKDEV_API_KEY", "k");
    vi.stubGlobal("fetch", mockFetch(429, {}));
    await expect(getCustomMatchById("eu", "m1")).rejects.toMatchObject({ code: "RATE_LIMITED" });
  });
  it("sans clé API -> API_ERROR", async () => {
    vi.stubEnv("HENRIKDEV_API_KEY", "");
    await expect(getCustomMatchById("eu", "m1")).rejects.toMatchObject({ code: "API_ERROR" });
  });
});

describe("mapRawCustomMatch - rounds et duels", () => {
  it("mappe les issues de round vers les codes de la frise", async () => {
    vi.stubEnv("HENRIKDEV_API_KEY", "k");
    vi.stubGlobal("fetch", mockFetch(200, { data: [rawMatch] }));
    const [m] = await getPlayerCustomMatches("eu", "Zed", "EUW");
    expect(m.rounds).toEqual([
      { winningTeamId: "Red", outcome: "elim" },
      { winningTeamId: "Blue", outcome: "detonate" },
      { winningTeamId: "Red", outcome: "defuse" },
      // Tout ce qui n'est ni élimination ni action sur le spike retombe sur « time ».
      { winningTeamId: "Blue", outcome: "time" },
    ]);
  });
  it("normalise les duels et écarte ceux sans tueur ou sans victime", async () => {
    vi.stubEnv("HENRIKDEV_API_KEY", "k");
    vi.stubGlobal("fetch", mockFetch(200, { data: [rawMatch] }));
    const [m] = await getPlayerCustomMatches("eu", "Zed", "EUW");
    expect(m.kills).toHaveLength(2);
    expect(m.kills[0]).toEqual({
      round: 0, timeInRoundMs: 9000,
      killerPuuid: "p1", victimPuuid: "p2", assistantPuuids: ["p3"],
    });
  });
});
