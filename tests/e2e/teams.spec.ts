import { test, expect } from "@playwright/test";

test("l'annuaire des équipes affiche l'équipe de démo", async ({ page }) => {
  await page.goto("/equipes");
  await expect(page.getByRole("heading", { name: "Équipes" })).toBeVisible();
  await expect(page.getByText("Alpha Esports")).toBeVisible();
});

test("le filtre région France montre l'équipe, une autre région la masque", async ({ page }) => {
  await page.goto("/equipes?region=France");
  await expect(page.getByText("Alpha Esports")).toBeVisible();
  await page.goto("/equipes?region=DACH");
  await expect(page.getByText("Alpha Esports")).toHaveCount(0);
});

test("la page équipe affiche le nom et la section roster", async ({ page }) => {
  await page.goto("/equipes/seed-team-alpha");
  await expect(page.getByRole("heading", { name: /Alpha Esports/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Roster" })).toBeVisible();
});

test("une page admin redirige un visiteur non connecté", async ({ page }) => {
  await page.goto("/admin/equipes");
  await expect(page).toHaveURL("http://localhost:3200/");
});
