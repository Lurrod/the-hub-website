import { test, expect } from "@playwright/test";

test("la page tournoi VCT affiche les poules et le bracket", async ({ page }) => {
  await page.goto("/tournois/vct-emea-stage1");
  await expect(page.getByRole("heading", { name: "VCT EMEA 2026 — Stage 1" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Poules" })).toBeVisible();
  await expect(page.getByText("Groupe Alpha")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bracket" })).toBeVisible();
  await expect(page.getByText("Finale", { exact: true })).toBeVisible();
});

test("la page match affiche le score et le détail des maps", async ({ page }) => {
  await page.goto("/matchs/vct-m-1");
  await expect(page.getByRole("link", { name: "Team Heretics" })).toBeVisible();
  await expect(page.getByText("Ascent")).toBeVisible();
});

test("l'accueil affiche le feed des derniers résultats", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Derniers résultats" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tournois en cours / à venir" })).toBeVisible();
});

test("l'index des matchs groupe les matchs par tournoi (accordéon)", async ({ page }) => {
  await page.goto("/matchs");
  await expect(page.getByRole("heading", { name: "Matchs", exact: true })).toBeVisible();
  await expect(page.getByText("VCT EMEA 2026 — Stage 1").first()).toBeVisible();
  await expect(page.getByText("Team Heretics").first()).toBeVisible();
});
