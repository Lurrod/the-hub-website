import { test, expect } from "@playwright/test";

test("l'index des matchs affiche la section Prochains matchs", async ({ page }) => {
  await page.goto("/matchs");
  await expect(page.getByRole("heading", { name: "Prochains matchs" })).toBeVisible();
});

test("la page équipe affiche les résultats récents", async ({ page }) => {
  await page.goto("/equipes/vct-team-hrt");
  await expect(page.getByRole("heading", { name: "Résultats récents" })).toBeVisible();
});

test("la page match affiche le bouton VOD quand une VOD existe", async ({ page }) => {
  await page.goto("/matchs/vct-m-1");
  await expect(page.getByRole("link", { name: "Voir la VOD" })).toBeVisible();
});
