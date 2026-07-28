import { test, expect } from "@playwright/test";

test("la page profil montre le joueur, son équipe actuelle et l'historique", async ({ page }) => {
  await page.goto("/joueurs/seed-player-neo");
  await expect(page.getByRole("heading", { name: "Neo" })).toBeVisible();
  await expect(page.getByText("Alpha Esports").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Historique d'équipes" })).toBeVisible();
});

test("la page équipe affiche le roster avec le joueur", async ({ page }) => {
  await page.goto("/equipes/seed-team-alpha");
  await expect(page.getByRole("heading", { name: "Roster" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Neo" })).toBeVisible();
});

test("la page roster admin redirige un visiteur non connecté", async ({ page }) => {
  await page.goto("/admin/equipes/seed-team-alpha/roster");
  await expect(page).toHaveURL("http://localhost:3200/");
});
