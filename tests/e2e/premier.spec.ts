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
  // Forme canonique `<slug>--<id>` : les liens internes l'émettent, et une
  // entrée par l'ancienne forme y est redirigée en 301.
  await expect(page).toHaveURL(/\/tournois\/[a-z0-9-]*--fx-premier-invite$/);
});

test("chaque palier porte ses propres résultats", async ({ page }) => {
  await page.goto("/premier");

  // Un bloc de résultats par palier, sous son classement, et non une liste
  // commune : un palier très actif prendrait sinon toutes les places de l'autre.
  await expect(page.getByRole("heading", { level: 3, name: "Derniers résultats" })).toHaveCount(2);

  // Les deux matchs des fixtures, un par palier.
  await expect(page.locator("a[href^='/matchs/fx-premier-m-']")).toHaveCount(2);
});

test("chaque palier a son bouton vers le classement complet", async ({ page }) => {
  await page.goto("/premier");
  const boutons = page.getByRole("link", { name: "Classement complet" });
  await expect(boutons).toHaveCount(2);
  await boutons.first().click();
  // Forme canonique `<slug>--<id>` : les liens internes l'émettent, et une
  // entrée par l'ancienne forme y est redirigée en 301.
  await expect(page).toHaveURL(/\/tournois\/[a-z0-9-]*--fx-premier-invite$/);
});
