import { test, expect } from "@playwright/test";

test("la page profil montre le joueur, son équipe actuelle et son parcours", async ({ page }) => {
  await page.goto("/joueurs/seed-player-neo");
  await expect(page.getByRole("heading", { name: "Neo" })).toBeVisible();
  await expect(page.getByText("Alpha Esports").first()).toBeVisible();
  // « Historique d'equipes » est devenu l'onglet « Equipes ».
  await expect(page.getByRole("link", { name: "Équipes", exact: true })).toBeVisible();
});

test("la page équipe affiche le roster avec le joueur", async ({ page }) => {
  await page.goto("/equipes/seed-team-alpha");
  await expect(page.getByRole("heading", { name: "Roster" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Neo" })).toBeVisible();
});

// La gestion de roster a quitte /admin pour /equipes/<id>/gestion/roster. Un
// visiteur sans session y est renvoye vers la connexion par le backstop de
// src/proxy.ts, avec l'URL demandee en callback.
test("la gestion de roster renvoie un visiteur non connecté vers la connexion", async ({
  page,
}) => {
  await page.goto("/equipes/seed-team-alpha/gestion/roster");
  await expect(page).toHaveURL(/\/api\/auth\/signin/);
});
