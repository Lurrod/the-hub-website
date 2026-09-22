import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { createAccount, disconnect, signIn, type TestAccount } from "./session";

/*
 * Petite finale : une option du tournoi, éteinte par défaut.
 *
 * Côté public, `fmt-single-elim` (prisma/seed-formats.ts) l'a activée et porte
 * une petite finale FUT–VIT à jouer. Côté gestion, un tournoi jetable est créé
 * pour chaque test, sans l'option : on vérifie qu'elle se propose, qu'elle se
 * sauvegarde, et qu'un match « Petite finale » est refusé tant qu'elle est
 * éteinte.
 */

const db = new PrismaClient();
const comptes: TestAccount[] = [];
const tournois: string[] = [];

test.afterAll(async () => {
  // Matchs et inscriptions tombent en cascade avec le tournoi.
  await db.tournament.deleteMany({ where: { id: { in: tournois } } });
  for (const c of comptes) await c.cleanup();
  await db.$disconnect();
  await disconnect();
});

/** Compte admin : il gère n'importe quel tournoi, sans table de managers. */
async function compteAdmin(): Promise<TestAccount> {
  const compte = await createAccount({ onboarded: true });
  comptes.push(compte);
  await db.user.update({ where: { id: compte.userId }, data: { globalRole: "ADMIN" } });
  return compte;
}

/** Tournoi à élimination directe, deux équipes inscrites, option éteinte. */
async function tournoiJetable(): Promise<string> {
  const id = `e2e-pf-${Date.now()}-${process.pid}-${tournois.length}`;
  tournois.push(id);
  await db.tournament.create({
    data: {
      id,
      name: `E2E petite finale ${tournois.length}`,
      region: "France",
      format: "SINGLE_ELIM",
      participants: { create: [{ teamId: "vlr-th" }, { teamId: "vlr-vit" }] },
    },
  });
  return id;
}

test("la petite finale s'affiche à part, sous l'arbre", async ({ page }) => {
  await page.goto("/tournois/fmt-single-elim");

  const titre = page.getByText("Match pour la 3e place");
  await expect(titre).toBeVisible();
  // Cherché dans le bloc de la petite finale : le même match figure aussi dans
  // la liste des rencontres à venir de la page.
  const bloc = titre.locator("xpath=..");
  await expect(bloc.locator('a[href="/matchs/fmt-single-elim-m-tp"]')).toBeVisible();
  // L'arbre garde sa forme : la finale reste le dernier tour.
  await expect(page.getByText("Finale", { exact: true }).first()).toBeVisible();
});

test("l'option est décochée par défaut et disparaît hors élimination directe", async ({
  context,
  page,
}) => {
  const id = await tournoiJetable();
  await signIn(context, await compteAdmin());
  await page.goto(`/tournois/${id}/gestion`);

  const option = page.getByRole("checkbox", { name: /Petite finale/ });
  await expect(option).toBeVisible();
  await expect(option).not.toBeChecked();

  await page.getByRole("button", { name: /Système suisse/ }).click();
  await expect(option).toHaveCount(0);
});

test("l'option se sauvegarde depuis les paramètres du tournoi", async ({ context, page }) => {
  const id = await tournoiJetable();
  await signIn(context, await compteAdmin());
  await page.goto(`/tournois/${id}/gestion`);

  await page.getByRole("checkbox", { name: /Petite finale/ }).check();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page).toHaveURL(/ok=tournament-saved/);

  const t = await db.tournament.findUnique({ where: { id }, select: { thirdPlaceMatch: true } });
  expect(t?.thirdPlaceMatch).toBe(true);
  await expect(page.getByRole("checkbox", { name: /Petite finale/ })).toBeChecked();
});

test("un match « Petite finale » est refusé tant que l'option est éteinte", async ({
  context,
  page,
}) => {
  const id = await tournoiJetable();
  await signIn(context, await compteAdmin());

  const creer = async () => {
    await page.goto(`/tournois/${id}/gestion/competition`);
    await page.locator('select[name="teamAId"]').selectOption("vlr-th");
    await page.locator('select[name="teamBId"]').selectOption("vlr-vit");
    await page.locator('input[name="round"]').fill("Petite finale");
    await page.getByRole("button", { name: "Créer le match" }).click();
  };

  await creer();
  await expect(page).toHaveURL(/error=thirdplace/);
  expect(await db.match.count({ where: { tournamentId: id } })).toBe(0);

  await db.tournament.update({ where: { id }, data: { thirdPlaceMatch: true } });
  await creer();
  // Attendre l'écriture réelle : une assertion sur l'URL passerait avant même
  // que le formulaire soit parti.
  await expect
    .poll(() => db.match.count({ where: { tournamentId: id, round: "Petite finale" } }))
    .toBe(1);
  await expect(page).not.toHaveURL(/error=/);
});
