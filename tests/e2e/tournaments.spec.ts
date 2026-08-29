import { test, expect } from "@playwright/test";

// Le jeu de donnees de dev ne contient plus que les tournois de demonstration
// des formats (prisma/seed-formats.ts, `npm run db:seed:formats`).
const TOURNOI = "Hub Invitational - Élimination directe";

test("l'annuaire des tournois affiche le tournoi de démo", async ({ page }) => {
  await page.goto("/tournois");
  await expect(page.getByRole("heading", { name: "Tournois" })).toBeVisible();
  await expect(page.getByText(TOURNOI).first()).toBeVisible();
});

test("la page tournoi affiche l'en-tête et l'équipe inscrite", async ({ page }) => {
  await page.goto("/tournois/fmt-single-elim");
  await expect(page.getByRole("heading", { name: TOURNOI })).toBeVisible();
  await expect(page.getByText("Team Heretics").first()).toBeVisible();
  // Anciennement « Equipes inscrites ».
  await expect(page.getByRole("heading", { name: "Équipes participantes" })).toBeVisible();
});

// Le bandeau de l'aperçu s'arrêtait aux quatre derniers résultats : sur un
// tournoi Premier, quatre lignes sur les dizaines jouées ne disaient rien. Il
// remonte maintenant tout, c'est la hauteur de la colonne qui borne l'affichage
// et le reste défile. Le round robin de démo compte quinze matchs, tous joués.
test("le bandeau de l'aperçu ne tronque plus les résultats", async ({ page }) => {
  await page.goto("/tournois/fmt-round-robin");
  const resultats = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Derniers résultats" }) });
  await expect(resultats.locator('a[href^="/matchs/"]')).toHaveCount(15);
});

test("la page admin tournois redirige un visiteur non connecté", async ({ page }) => {
  await page.goto("/admin/tournois");
  await expect(page).toHaveURL("http://localhost:3200/");
});
