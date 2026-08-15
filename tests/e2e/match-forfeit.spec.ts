import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { createAccount, disconnect, signIn, type TestAccount } from "./session";

/*
 * Un match gagné par forfait n'était pas distinguable d'un match joué : le
 * bracket affichait un score chiffré (souvent 0-0, sans vainqueur possible).
 * Ce parcours vérifie qu'un forfait déclaré à la saisie donne la victoire à
 * l'adversaire et s'affiche « W / FF » dans l'arbre public.
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
      name: `E2E Forfait ${Date.now()}`,
      region: "France",
      format: "SINGLE_ELIM",
      managers: { create: { userId: account.userId, role: "OWNER" } },
      participants: {
        create: [{ teamId: TEAM_A.id }, { teamId: TEAM_B.id }],
      },
    },
  });
  tournamentId = tournament.id;
});

test.afterAll(async () => {
  // Matchs, inscriptions et managers tombent en cascade avec le tournoi.
  await db.tournament.deleteMany({ where: { id: tournamentId } });
  await account.cleanup();
  await db.$disconnect();
  await disconnect();
});

test("un forfait donne la victoire à l'adversaire et s'affiche FF", async ({ context, page }) => {
  await signIn(context, account);
  await page.goto(`/tournois/${tournamentId}/gestion/competition`);

  const creation = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Créer le match" }) });
  await creation.locator('select[name="teamAId"]').selectOption(TEAM_A.id);
  await creation.locator('select[name="teamBId"]').selectOption(TEAM_B.id);
  await creation.locator('select[name="status"]').selectOption("FINISHED");
  await creation.locator('select[name="forfeit"]').selectOption("TEAM_B");
  await creation.getByLabel(/^Tour/).fill("Finale");
  await creation.getByRole("button", { name: "Créer le match" }).click();

  // L'action redirige vers l'URL déjà courante : on attend la ligne du match,
  // qui n'apparaît qu'après redirect et revalidation.
  await expect(page.getByText("Team Heretics 0-0 Team Vitality")).toBeVisible({
    timeout: 15_000,
  });

  // Le score reste 0-0, mais le forfait désigne le vainqueur.
  const match = await db.match.findFirst({
    where: { tournamentId },
    select: { forfeit: true, winnerId: true },
  });
  expect(match?.forfeit).toBe("TEAM_B");
  expect(match?.winnerId).toBe(TEAM_A.id);

  // L'arbre public affiche W / FF à la place du score chiffré.
  await page.goto(`/tournois/${tournamentId}`);
  await expect(page.getByText("FF", { exact: true })).toBeVisible();
  await expect(page.getByText("W", { exact: true })).toBeVisible();
});
