import { test, expect } from "@playwright/test";

test("l'accueil affiche le bouton de connexion Discord quand déconnecté", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: /Connexion Discord/i })).toBeVisible();
});

test("la navigation principale est présente", async ({ page }) => {
  await page.goto("/");
  const nav = page.locator("header");
  await expect(nav.getByRole("link", { name: "Tournois" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Équipes" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Matchs" })).toBeVisible();
});
