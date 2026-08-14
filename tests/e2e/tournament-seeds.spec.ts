import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { createAccount, disconnect, signIn, type TestAccount } from "./session";

/*
 * Le seed d'une équipe déjà inscrite n'était modifiable par aucun formulaire :
 * le sélecteur d'équipe du bloc « Inscrire » écarte les inscrits, et c'était le
 * seul champ `seed` du site. Le seul recours était de retirer l'équipe puis de
 * la réinscrire — or `removeParticipant` supprime aussi tous ses matchs dans le
 * tournoi. Ces parcours vérifient que la correction se fait désormais sur place.
 */

const db = new PrismaClient();

/** Équipes du jeu de démonstration (`npm run db:seed:vlr`). */
const TEAM_A = { id: "vlr-th", name: "Team Heretics" };
const TEAM_B = { id: "vlr-vit", name: "Team Vitality" };

let account: TestAccount;
let tournamentId: string;

test.beforeAll(async () => {
  account = await createAccount({ onboarded: true });
  const tournament = await db.tournament.create({
    data: {
      name: `E2E Seeds ${Date.now()}`,
      region: "France",
      format: "SINGLE_ELIM",
      managers: { create: { userId: account.userId, role: "OWNER" } },
      participants: {
        create: [
          { teamId: TEAM_A.id, seed: 1 },
          { teamId: TEAM_B.id, seed: 2 },
        ],
      },
    },
  });
  tournamentId = tournament.id;
});

test.afterAll(async () => {
  // Les inscriptions et les managers tombent en cascade avec le tournoi.
  await db.tournament.deleteMany({ where: { id: tournamentId } });
  await account.cleanup();
  await db.$disconnect();
  await disconnect();
});

/** Seed réellement enregistré pour une équipe, source de vérité du test. */
async function seedEnBase(teamId: string): Promise<number | null> {
  const p = await db.tournamentParticipant.findFirst({
    where: { tournamentId, teamId },
    select: { seed: true },
  });
  return p?.seed ?? null;
}

/**
 * Remet les seeds d'aplomb avant chaque test.
 *
 * `getTournament` trie les inscrits par seed croissant : un test qui change un
 * seed réordonne les lignes de la page. Sans cette remise à zéro, les tests se
 * contamineraient dans un ordre qui dépend de ce que le précédent a écrit.
 */
async function reinitialiserSeeds() {
  await db.tournamentParticipant.updateMany({
    where: { tournamentId, teamId: TEAM_A.id },
    data: { seed: 1 },
  });
  await db.tournamentParticipant.updateMany({
    where: { tournamentId, teamId: TEAM_B.id },
    data: { seed: 2 },
  });
}

test.describe("seed d'une équipe inscrite", () => {
  test.beforeEach(reinitialiserSeeds);

  /**
   * La ligne d'une équipe, repérée par son nom. Viser par position casserait
   * dès qu'un seed change, puisque l'ordre d'affichage suit le seed.
   */
  const ligne = (page: Page, nom: string) => page.locator("li").filter({ hasText: nom });

  test("se modifie sans retirer l'équipe", async ({ context, page }) => {
    await signIn(context, account);
    await page.goto(`/tournois/${tournamentId}/gestion/inscrits`);

    const bloc = ligne(page, TEAM_A.name);
    await expect(bloc.getByLabel(`Seed de ${TEAM_A.name}`)).toHaveValue("1");

    await bloc.getByLabel(`Seed de ${TEAM_A.name}`).fill("7");
    await bloc.getByRole("button", { name: "Enregistrer" }).click();
    // Attendre la redirection de l'action : sans elle, la base est lue avant
    // l'écriture, et le champ affiche encore la valeur tapée côté client — donc
    // un `toHaveValue` seul passerait même si rien n'avait été enregistré.
    await page.waitForURL(/ok=seed-updated/);

    expect(await seedEnBase(TEAM_A.id)).toBe(7);
    await expect(ligne(page, TEAM_A.name).getByLabel(`Seed de ${TEAM_A.name}`)).toHaveValue("7");
  });

  test("se vide pour revenir sur une saisie erronée", async ({ context, page }) => {
    await signIn(context, account);
    await page.goto(`/tournois/${tournamentId}/gestion/inscrits`);

    const bloc = ligne(page, TEAM_B.name);
    await bloc.getByLabel(`Seed de ${TEAM_B.name}`).fill("");
    await bloc.getByRole("button", { name: "Enregistrer" }).click();
    await page.waitForURL(/ok=seed-updated/);

    expect(await seedEnBase(TEAM_B.id)).toBeNull();
    await expect(ligne(page, TEAM_B.name).getByLabel(`Seed de ${TEAM_B.name}`)).toHaveValue("");
  });

  test("refuse un seed déjà occupé par une autre équipe", async ({ context, page }) => {
    // Le contrôle de collision vit dans la transaction d'insertion : il doit
    // valoir aussi pour une mise à jour, pas seulement pour une inscription.
    await signIn(context, account);
    await page.goto(`/tournois/${tournamentId}/gestion/inscrits`);

    const bloc = ligne(page, TEAM_B.name);
    await bloc.getByLabel(`Seed de ${TEAM_B.name}`).fill("1");
    await bloc.getByRole("button", { name: "Enregistrer" }).click();

    await expect(page).toHaveURL(/error=seedtaken/);
    expect(await seedEnBase(TEAM_B.id)).toBe(2);
  });
});
