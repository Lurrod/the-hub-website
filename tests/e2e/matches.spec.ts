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

// fmt-league-m-aller-4 (prisma/seed-formats.ts) : journée aller de « Hub Pro
// League - Saison 1 », Team Vitality (VIT) contre FNATIC (FNC). Les deux
// équipes se sont déjà affrontées cinq fois avant ce match.
test("la fiche de match affiche le bilan des confrontations directes et la forme récente", async ({
  page,
}) => {
  await page.goto("/matchs/fmt-league-m-aller-4");
  await expect(page.getByRole("heading", { name: "Confrontations directes" })).toBeVisible();
  // Le bilan est éclaté en plusieurs `span` (dont un `sr-only`) : le texte
  // concaténé du paragraphe est vérifié tel quel plutôt qu'un fragment.
  const bilan = page.locator("p", { hasText: "Bilan des confrontations" });
  await expect(bilan).toHaveText("Bilan des confrontations : VIT 1-4 FNC");
  await expect(page.getByRole("heading", { name: "Forme récente" })).toBeVisible();
  // Le match consulté ne doit figurer dans aucune de ses propres listes
  // (bilan ou forme) : les requêtes excluent explicitement son id.
  await expect(page.locator('a[href="/matchs/fmt-league-m-aller-4"]')).toHaveCount(0);
  // Cinq rencontres antérieures, sous la limite de 10 : pas de mention de
  // troncature.
  await expect(page.getByText("Sur les 10 dernières rencontres")).toHaveCount(0);
});

// fmt-round-robin-m-rr-13 (prisma/seed-formats.ts) : « Hub Round Robin Cup »,
// Team Liquid contre FUT Esports. Ces deux équipes ne se sont jamais
// affrontées, mais chacune a trois matchs de forme antérieurs.
test("la fiche de match signale une première rencontre quand seule la forme est connue", async ({
  page,
}) => {
  await page.goto("/matchs/fmt-round-robin-m-rr-13");
  await expect(page.getByText("Première rencontre entre les deux équipes.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Forme récente" })).toBeVisible();
});

// fmt-round-robin-m-rr-1 (prisma/seed-formats.ts) : le tout premier match du
// jeu de données (day -60), donc aucune des deux équipes n'a de passé.
test("la fiche de match masque les confrontations et la forme sans antécédent", async ({
  page,
}) => {
  await page.goto("/matchs/fmt-round-robin-m-rr-1");
  await expect(page.getByRole("heading", { name: "Confrontations directes" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Forme récente" })).toHaveCount(0);
});
