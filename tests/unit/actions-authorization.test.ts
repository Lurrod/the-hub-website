import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Matrice d'autorisation des server actions.
 *
 * Ces actions sont le vrai point d'entrée des écritures : c'est là que se
 * décide qui a le droit de faire quoi. Les tests vérifient qu'une action
 * destructrice (suppression, distribution des droits) exige bien le niveau
 * PROPRIÉTAIRE, et qu'une action du quotidien se contente du niveau manager.
 *
 * Une inversion des deux gardes ne casserait aucun autre test : elle passerait
 * le typage, le lint et les parcours end-to-end joués avec un compte admin.
 */

const REDIRECT = "NEXT_REDIRECT";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/server", () => ({ after: (fn: () => unknown) => fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    // `redirect` de Next interrompt l'exécution en levant : on reproduit ce
    // comportement, sinon le code qui suit s'exécuterait à tort.
    throw Object.assign(new Error(REDIRECT), { url });
  },
}));

const auth = {
  requireAdmin: vi.fn(async () => ({ id: "admin", globalRole: "ADMIN" as const })),
  assertCanManageTeam: vi.fn(async () => ({ id: "u", globalRole: "USER" as const })),
  assertCanAdministerTeam: vi.fn(async () => ({ id: "u", globalRole: "USER" as const })),
  assertCanManageTournament: vi.fn(async () => ({ id: "u", globalRole: "USER" as const })),
  assertCanAdministerTournament: vi.fn(async () => ({ id: "u", globalRole: "USER" as const })),
};
vi.mock("@/lib/server-auth", () => auth);

vi.mock("@/lib/db", () => ({
  db: {
    tournamentParticipant: { count: vi.fn(async () => 0) },
    user: { findUnique: vi.fn(async () => ({ id: "target" })) },
    tournament: { findUnique: vi.fn(async () => ({ format: "GROUPS" })) },
    group: { findUnique: vi.fn(async () => null) },
  },
}));

vi.mock("@/lib/data/teams", () => ({
  createTeam: vi.fn(async () => ({ id: "t1" })),
  updateTeam: vi.fn(),
  deleteTeam: vi.fn(),
  setTeamLogo: vi.fn(),
  addTeamManager: vi.fn(),
  removeTeamManagerIfNotLast: vi.fn(async () => true),
  setTeamManagerRole: vi.fn(async () => true),
  addInitialRoster: vi.fn(),
  findTeamConflict: vi.fn(async () => null),
  generateTeamInvite: vi.fn(),
  revokeTeamInvite: vi.fn(),
}));

vi.mock("@/lib/data/tournaments", () => ({
  createTournament: vi.fn(async () => ({ id: "t1" })),
  updateTournament: vi.fn(),
  deleteTournament: vi.fn(),
  setTournamentLogo: vi.fn(),
  setTournamentBanner: vi.fn(),
  addParticipant: vi.fn(async () => true),
  removeParticipant: vi.fn(),
  addTournamentManager: vi.fn(),
  removeTournamentManagerIfNotLast: vi.fn(async () => true),
  setTournamentManagerRole: vi.fn(async () => true),
}));

vi.mock("@/lib/images", () => ({
  readUploadedImage: vi.fn(async () => null),
  processAndStoreImage: vi.fn(),
}));

/** Exécute une action en absorbant la redirection finale, qui est normale. */
async function run(fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
  } catch (e) {
    if (!(e instanceof Error) || e.message !== REDIRECT) throw e;
  }
}

beforeEach(() => {
  for (const fn of Object.values(auth)) fn.mockClear();
});

describe("actions d'équipe", () => {
  it("supprimer une équipe exige le niveau propriétaire", async () => {
    const { deleteTeamAction } = await import("@/app/admin/actions/teams");
    await run(() => deleteTeamAction("team-1"));
    expect(auth.assertCanAdministerTeam).toHaveBeenCalledWith("team-1");
    expect(auth.assertCanManageTeam).not.toHaveBeenCalled();
  });

  it("ajouter un manager exige le niveau propriétaire", async () => {
    const { addManagerAction } = await import("@/app/admin/actions/teams");
    const fd = new FormData();
    fd.set("discordId", "123");
    await run(() => addManagerAction("team-1", fd));
    expect(auth.assertCanAdministerTeam).toHaveBeenCalledWith("team-1");
  });

  it("retirer un manager exige le niveau propriétaire", async () => {
    const { removeManagerAction } = await import("@/app/admin/actions/teams");
    await run(() => removeManagerAction("team-1", "u2"));
    expect(auth.assertCanAdministerTeam).toHaveBeenCalledWith("team-1");
  });

  it("changer le niveau d'un manager exige le niveau propriétaire", async () => {
    const { setManagerRoleAction } = await import("@/app/admin/actions/teams");
    const fd = new FormData();
    fd.set("role", "OWNER");
    await run(() => setManagerRoleAction("team-1", "u2", fd));
    expect(auth.assertCanAdministerTeam).toHaveBeenCalledWith("team-1");
  });

  it("modifier la fiche se contente du niveau manager", async () => {
    const { updateTeamAction } = await import("@/app/admin/actions/teams");
    const fd = new FormData();
    fd.set("name", "Alpha");
    fd.set("tag", "ALP");
    fd.set("region", "France");
    await run(() => updateTeamAction("team-1", fd));
    expect(auth.assertCanManageTeam).toHaveBeenCalledWith("team-1");
    expect(auth.assertCanAdministerTeam).not.toHaveBeenCalled();
  });

  it("créer une équipe reste réservé aux administrateurs du site", async () => {
    const { createTeamAction } = await import("@/app/admin/actions/teams");
    const fd = new FormData();
    fd.set("name", "Alpha");
    fd.set("tag", "ALP");
    fd.set("region", "France");
    await run(() => createTeamAction(fd));
    expect(auth.requireAdmin).toHaveBeenCalled();
  });
});

describe("actions de tournoi", () => {
  it("supprimer un tournoi exige le niveau propriétaire", async () => {
    const { deleteTournamentAction } = await import("@/app/admin/actions/tournaments");
    await run(() => deleteTournamentAction("trn-1"));
    expect(auth.assertCanAdministerTournament).toHaveBeenCalledWith("trn-1");
    expect(auth.assertCanManageTournament).not.toHaveBeenCalled();
  });

  it("administrer les managers exige le niveau propriétaire", async () => {
    const mod = await import("@/app/admin/actions/tournaments");
    const fd = new FormData();
    fd.set("discordId", "123");
    await run(() => mod.addTournamentManagerAction("trn-1", fd));
    await run(() => mod.removeTournamentManagerAction("trn-1", "u2"));
    await run(() => mod.setTournamentManagerRoleAction("trn-1", "u2", new FormData()));
    expect(auth.assertCanAdministerTournament).toHaveBeenCalledTimes(3);
    expect(auth.assertCanManageTournament).not.toHaveBeenCalled();
  });

  it("inscrire un participant se contente du niveau manager", async () => {
    const { addParticipantAction } = await import("@/app/admin/actions/tournaments");
    const fd = new FormData();
    fd.set("teamId", "team-1");
    await run(() => addParticipantAction("trn-1", fd));
    expect(auth.assertCanManageTournament).toHaveBeenCalledWith("trn-1");
    expect(auth.assertCanAdministerTournament).not.toHaveBeenCalled();
  });

  it("modifier la fiche se contente du niveau manager", async () => {
    const { updateTournamentAction } = await import("@/app/admin/actions/tournaments");
    const fd = new FormData();
    fd.set("name", "Coupe");
    fd.set("region", "France");
    fd.set("format", "GROUPS");
    await run(() => updateTournamentAction("trn-1", fd));
    expect(auth.assertCanManageTournament).toHaveBeenCalledWith("trn-1");
    expect(auth.assertCanAdministerTournament).not.toHaveBeenCalled();
  });
});

describe("actions d'invitation d'équipe", () => {
  it("générer et révoquer un lien exigent le niveau manager", async () => {
    const mod = await import("@/app/equipes/actions");
    await run(() => mod.generateInviteAction("team-1"));
    await run(() => mod.revokeInviteAction("team-1"));
    expect(auth.assertCanManageTeam).toHaveBeenCalledTimes(2);
  });
});
