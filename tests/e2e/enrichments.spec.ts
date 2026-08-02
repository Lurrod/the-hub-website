import { test, expect } from "@playwright/test";

// La section « Prochains matchs » n'existe plus sur /matchs : depuis la refonte
// l'index groupe par tournoi (couvert par matches.spec). Les rencontres a venir
// sont presentees sur la fiche tournoi, sous « Matchs a venir ».
test("la fiche tournoi affiche la section des matchs à venir", async ({ page }) => {
  await page.goto("/tournois/fmt-single-elim");
  await expect(page.getByRole("heading", { name: "Matchs à venir" })).toBeVisible();
});

// Anciennement « Resultats recents ».
test("la page équipe affiche les derniers résultats", async ({ page }) => {
  await page.goto("/equipes/vlr-th");
  await expect(page.getByRole("heading", { name: "Derniers résultats" })).toBeVisible();
});

test("la page match affiche le bouton VOD quand une VOD existe", async ({ page }) => {
  await page.goto("/matchs/fmt-single-elim-m-qf1");
  await expect(page.getByRole("link", { name: "Voir la VOD" })).toBeVisible();
});
