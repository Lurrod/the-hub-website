import { test, expect } from "@playwright/test";

/**
 * La page /premier est une page d'assemblage : des requêtes, une troncature et
 * des composants déjà couverts ailleurs. Il n'y a aucune logique pure à tester
 * unitairement, et en inventer pour faire monter la couverture n'apprendrait
 * rien. Le filet est donc ici, sur ce qui casserait sans qu'on s'en aperçoive —
 * une requête qui ne rend plus rien, un lien de panneau qui ne mène nulle part,
 * l'entrée de navigation oubliée lors d'un remaniement.
 */
test("l'entrée de navigation mène à la page Premier", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation").getByRole("link", { name: "Premier" }).click();
  await expect(page).toHaveURL(/\/premier$/);
  await expect(page.getByRole("heading", { level: 1, name: "Premier" })).toBeVisible();
});

test("les deux panneaux de classement sont affichés et mènent à leur tournoi", async ({ page }) => {
  await page.goto("/premier");

  const invite = page.getByRole("link", { name: "Premier Invite — Fixtures" });
  const contender = page.getByRole("link", { name: "Premier Contender — Fixtures" });
  await expect(invite.first()).toBeVisible();
  await expect(contender.first()).toBeVisible();

  await invite.first().click();
  await expect(page).toHaveURL(/\/tournois\/fx-premier-invite$/);
});

test("les derniers résultats sont listés", async ({ page }) => {
  await page.goto("/premier");
  await expect(page.getByRole("heading", { level: 2, name: "Derniers résultats" })).toBeVisible();
  // Les deux matchs des fixtures, un par palier.
  await expect(page.locator("a[href^='/matchs/fx-premier-m-']")).toHaveCount(2);
});
