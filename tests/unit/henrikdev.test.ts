import { describe, it, expect, vi, afterEach } from "vitest";
import { verifyRiotId, RiotIdError } from "@/lib/henrikdev";

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  } as Response);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("verifyRiotId", () => {
  it("retourne puuid/region sur succès", async () => {
    vi.stubEnv("HENRIKDEV_API_KEY", "k");
    vi.stubGlobal("fetch", mockFetch(200, { data: { puuid: "p-1", region: "eu", name: "Zed", tag: "EUW" } }));
    await expect(verifyRiotId("Zed", "EUW")).resolves.toEqual({
      puuid: "p-1", region: "eu", name: "Zed", tag: "EUW",
    });
  });
  it("404 -> NOT_FOUND", async () => {
    vi.stubEnv("HENRIKDEV_API_KEY", "k");
    vi.stubGlobal("fetch", mockFetch(404, {}));
    await expect(verifyRiotId("x", "yyy")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("429 -> RATE_LIMITED", async () => {
    vi.stubEnv("HENRIKDEV_API_KEY", "k");
    vi.stubGlobal("fetch", mockFetch(429, {}));
    await expect(verifyRiotId("x", "yyy")).rejects.toMatchObject({ code: "RATE_LIMITED" });
  });
  it("clé absente -> API_ERROR", async () => {
    vi.stubEnv("HENRIKDEV_API_KEY", "");
    await expect(verifyRiotId("x", "yyy")).rejects.toBeInstanceOf(RiotIdError);
  });
});
