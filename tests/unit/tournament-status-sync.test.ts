import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Le recalage est la seule partie de `tournament-status` qui touche la base :
 * elle est isolée ici, avec un client Prisma doublé, pour vérifier la forme des
 * requêtes émises — c'est là que se joue le fait qu'un tournoi bascule au bon
 * moment.
 */
type UpdateMany = (args: unknown) => Promise<{ count: number }>;
const updateMany = vi.fn<UpdateMany>(async () => ({ count: 0 }));
const transaction = vi.fn(async (ops: unknown[]) => Promise.all(ops as Promise<unknown>[]));

vi.mock("@/lib/db", () => ({
  db: {
    $transaction: (ops: unknown[]) => transaction(ops),
    tournament: { updateMany: (args: unknown) => updateMany(args) },
  },
}));

// L'écriture et son étranglement ont rejoint la couche données ; les
// décisions pures restent dans le module d'origine.
const { syncTournamentStatuses, syncTournamentStatusesIfStale, resetSyncThrottle } =
  await import("@/lib/data/tournament-status");
const { finishedCutoff, SYNC_INTERVAL_MS } = await import("@/lib/tournament-status");

beforeEach(() => {
  updateMany.mockClear();
  transaction.mockClear();
  updateMany.mockImplementation(async () => ({ count: 0 }));
  resetSyncThrottle();
});

describe("syncTournamentStatuses", () => {
  it("émet les deux mises à jour dans une seule transaction", () => {
    return syncTournamentStatuses().then(() => {
      expect(transaction).toHaveBeenCalledTimes(1);
      expect(updateMany).toHaveBeenCalledTimes(2);
    });
  });

  it("termine les tournois dont la date de fin est passée", async () => {
    await syncTournamentStatuses();
    const [args] = updateMany.mock.calls[0] as unknown as [Record<string, never>];
    expect(args).toMatchObject({ data: { status: "FINISHED" } });
    const where = (args as unknown as { where: Record<string, unknown> }).where;
    expect(where.status).toEqual({ not: "FINISHED" });
    expect((where.endDate as { lt: Date }).lt.getTime()).toBe(finishedCutoff().getTime());
  });

  it("lance les tournois commencés, y compris ceux sans date de fin", async () => {
    // Un tournoi sans date de fin ne doit pas rester bloqué « À venir » : c'est
    // ce que garantit la clause OR sur endDate.
    await syncTournamentStatuses();
    const [args] = updateMany.mock.calls[1] as unknown as [
      { where: Record<string, unknown>; data: unknown },
    ];
    expect(args.data).toEqual({ status: "ONGOING" });
    expect(args.where.status).toBe("UPCOMING");
    expect(args.where.OR).toEqual([{ endDate: null }, { endDate: { gte: finishedCutoff() } }]);
  });

  it("rend le total des deux mises à jour", async () => {
    updateMany
      .mockImplementationOnce(async () => ({ count: 3 }))
      .mockImplementationOnce(async () => ({ count: 2 }));
    expect(await syncTournamentStatuses()).toBe(5);
  });
});

describe("syncTournamentStatusesIfStale", () => {
  it("recale au premier appel", async () => {
    await syncTournamentStatusesIfStale();
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it("ne rejoue pas dans l'intervalle d'étranglement", async () => {
    // Sans cette garde, chaque consultation d'une liste de tournois émettrait
    // un UPDATE.
    await syncTournamentStatusesIfStale();
    await syncTournamentStatusesIfStale();
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it("rejoue une fois l'intervalle écoulé", async () => {
    const realNow = Date.now;
    const t0 = realNow();
    try {
      Date.now = () => t0;
      await syncTournamentStatusesIfStale();
      Date.now = () => t0 + SYNC_INTERVAL_MS;
      await syncTournamentStatusesIfStale();
      expect(transaction).toHaveBeenCalledTimes(2);
    } finally {
      Date.now = realNow;
    }
  });

  it("repart à zéro après resetSyncThrottle", async () => {
    await syncTournamentStatusesIfStale();
    resetSyncThrottle();
    await syncTournamentStatusesIfStale();
    expect(transaction).toHaveBeenCalledTimes(2);
  });
});
