import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/henrikdev", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/henrikdev")>();
  return { ...actual, verifyRiotId: vi.fn() };
});
vi.mock("@/lib/data/players", () => ({
  findPlayerByPuuid: vi.fn(),
  isPuuidTakenByOther: vi.fn(),
}));

import { verifyRiotId } from "@/lib/henrikdev";
import { findPlayerByPuuid } from "@/lib/data/players";
import { resolveRiotAccountForClaim, riotFlashCode } from "@/lib/riot-account";

const account = { puuid: "puuid-1", region: "eu", name: "Lurrod", tag: "GOAT" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(verifyRiotId).mockResolvedValue(account);
  vi.mocked(findPlayerByPuuid).mockResolvedValue(null);
});

describe("resolveRiotAccountForClaim", () => {
  it("aucune autre fiche ne porte ce puuid : rien à revendiquer", async () => {
    const out = await resolveRiotAccountForClaim("Lurrod#GOAT", "moi");
    expect(out).toEqual({ account, claimableId: null });
  });

  it("fiche sans compte rattaché : elle est revendicable", async () => {
    vi.mocked(findPlayerByPuuid).mockResolvedValue({ id: "fiche-archive", userId: null });
    const out = await resolveRiotAccountForClaim("Lurrod#GOAT", "moi");
    expect(out.claimableId).toBe("fiche-archive");
  });

  it("fiche déjà rattachée à un compte : refus, pas de prise de contrôle", async () => {
    vi.mocked(findPlayerByPuuid).mockResolvedValue({ id: "fiche-autre", userId: "user-42" });
    await expect(resolveRiotAccountForClaim("Lurrod#GOAT", "moi")).rejects.toMatchObject({
      code: "TAKEN",
    });
  });

  it("exclut la fiche courante de la recherche", async () => {
    await resolveRiotAccountForClaim("Lurrod#GOAT", "moi");
    expect(vi.mocked(findPlayerByPuuid)).toHaveBeenCalledWith("puuid-1", "moi");
  });

  it("Riot ID mal formé : rejeté avant tout appel réseau", async () => {
    await expect(resolveRiotAccountForClaim("pasdetag", "moi")).rejects.toThrow("RIOT_FORMAT");
    expect(vi.mocked(verifyRiotId)).not.toHaveBeenCalled();
  });

  it("une fiche déjà prise se traduit par le bon code de toast", async () => {
    vi.mocked(findPlayerByPuuid).mockResolvedValue({ id: "x", userId: "user-42" });
    const err = await resolveRiotAccountForClaim("Lurrod#GOAT", "moi").catch((e) => e);
    expect(riotFlashCode(err)).toBe("riottaken");
  });
});
