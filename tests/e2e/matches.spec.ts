import { test, expect } from "@playwright/test";

// Le jeu de donnees de dev ne contient plus que les tournois de demonstration
// des formats (prisma/seed-formats.ts). `fmt-groups-elim` est le seul a porter
// a la fois des poules et un bracket.
const TOURNOI = "Hub Championship - Poules puis playoffs";

test("la page tournoi VCT affiche les poules et le bracket", async ({ page }) => {
  await page.goto("/tournois/fmt-groups-elim");
  await expect(page.getByRole("heading", { name: TOURNOI })).toBeVisible();
  // Les titres « Poules » et « Bracket » ont laisse place au menu « Etapes »,
  // dont les onglets portent le nom de chaque poule puis « Playoffs ». Seule
  // l'etape active est rendue : il faut donc basculer pour voir le bracket.
  await expect(page.getByRole("heading", { name: "Étapes" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Groupe A" })).toBeVisible();
  await page.getByRole("tab", { name: "Playoffs" }).click();
  await expect(page.getByText("Finale", { exact: true }).first()).toBeVisible();
});

test("la page match affiche le score et le détail des maps", async ({ page }) => {
  await page.goto("/matchs/fmt-single-elim-m-qf1");
  await expect(page.getByRole("link", { name: "Team Heretics" })).toBeVisible();
  await expect(page.getByText("Ascent")).toBeVisible();
});

// L'accueil a ete refondu : il n'a plus de sections « Derniers resultats » ni
// « Tournois en cours / a venir », mais une accroche et un appel a l'action
// vers les matchs analyses.
test("l'accueil présente le site et renvoie vers les matchs", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Voir les matchs analysés" })).toBeVisible();
});

test("l'index des matchs groupe les matchs par tournoi (accordéon)", async ({ page }) => {
  await page.goto("/matchs");
  await expect(page.getByRole("heading", { name: "Matchs", exact: true })).toBeVisible();
  await expect(page.getByText(TOURNOI).first()).toBeVisible();
  await expect(page.getByText("Team Heretics").first()).toBeVisible();
});
