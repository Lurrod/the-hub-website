import { test, expect } from "@playwright/test";

test("la barre de navigation contient un champ de recherche", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByPlaceholder("Rechercher…")).toBeVisible();
});

test("la recherche trouve une équipe par son nom", async ({ page }) => {
  await page.goto("/recherche?q=Vitality");
  await expect(page.getByRole("heading", { name: /Équipes/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Team Vitality/ })).toBeVisible();
});

test("une recherche sans résultat affiche un message", async ({ page }) => {
  await page.goto("/recherche?q=zzzznomatch");
  await expect(page.getByText(/Aucun résultat/)).toBeVisible();
});
