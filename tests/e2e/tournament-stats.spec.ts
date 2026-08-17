import { test, expect } from "@playwright/test";

/*
 * Onglet Stats de la fiche tournoi, sur le jeu de fixtures.
 *
 * `fx-map-2` est seedée sans faits d'armes (import antérieur simulé) : la
 * section « Clutchs et multikills » doit signaler la donnée partielle au lieu
 * de laisser croire à un tournoi sans clutch.
 */

test.describe("onglet Stats du tournoi", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tournois/fx-tournoi");
    await page.getByRole("tab", { name: "Stats" }).click();
  });

  test("les clutchs et multikills s'affichent avec la note de données partielles", async ({
    page,
  }) => {
    await expect(page.getByRole("heading", { name: "Clutchs et multikills" })).toBeVisible();
    await expect(page.getByText("Plus gros clutch")).toBeVisible();
    // Une note par section alimentée par les duels : clutchs ET armes.
    await expect(page.getByText("carte importée avant l'ajout de ces données")).toHaveCount(2);
  });

  test("la section armes montre la méta et le duel des fusils", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Les armes" })).toBeVisible();
    await expect(page.getByText("Vandal ou Phantom ?")).toBeVisible();
    await expect(page.getByText("Rois de l'Opérateur")).toBeVisible();
  });

  test("le classement des joueurs est trié au rating et mène aux fiches", async ({ page }) => {
    const section = page
      .locator("section", { has: page.getByRole("heading", { name: "Classement des joueurs" }) })
      .first();
    await expect(section).toBeVisible();
    // Le meilleur rating des fixtures est AlphaJoueur0 : il ouvre le tableau.
    const first = section.locator("ol > li").first();
    await expect(first).toContainText("AlphaJoueur0");
    await expect(first.locator("a")).toHaveAttribute("href", /\/joueurs\//);
  });
});
