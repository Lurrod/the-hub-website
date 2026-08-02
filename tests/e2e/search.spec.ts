import { test, expect } from "@playwright/test";

test("la barre de navigation contient un champ de recherche", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByPlaceholder("Rechercher…")).toBeVisible();
});

test("la recherche trouve une équipe par son nom", async ({ page }) => {
  await page.goto("/recherche?q=Vitality");
  // Les intitules de categorie ne sont pas des titres mais de simples libelles.
  await expect(page.getByText("Équipes", { exact: true }).first()).toBeVisible();
  // `.first()` : plusieurs jeux de donnees de dev peuvent contenir une equipe
  // du meme nom (seed-dev et seed-vlr), la recherche les remonte toutes.
  await expect(page.getByRole("link", { name: /Team Vitality/ }).first()).toBeVisible();
});

test("une recherche sans résultat affiche un message", async ({ page }) => {
  await page.goto("/recherche?q=zzzznomatch");
  await expect(page.getByText(/Aucun résultat/)).toBeVisible();
});
