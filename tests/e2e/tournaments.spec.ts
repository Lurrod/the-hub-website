import { test, expect } from "@playwright/test";

test("l'annuaire des tournois affiche le tournoi de démo", async ({ page }) => {
  await page.goto("/tournois");
  await expect(page.getByRole("heading", { name: "Tournois" })).toBeVisible();
  await expect(page.getByText("Open de démo")).toBeVisible();
});

test("la page tournoi affiche l'en-tête et l'équipe inscrite", async ({ page }) => {
  await page.goto("/tournois/seed-tournament-open");
  await expect(page.getByRole("heading", { name: "Open de démo" })).toBeVisible();
  await expect(page.getByText("Alpha Esports")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Équipes inscrites" })).toBeVisible();
});

test("la page admin tournois redirige un visiteur non connecté", async ({ page }) => {
  await page.goto("/admin/tournois");
  await expect(page).toHaveURL("http://localhost:3200/");
});
