import { test, expect } from "@playwright/test";

test("l'annuaire des équipes affiche l'équipe de démo", async ({ page }) => {
  await page.goto("/equipes");
  await expect(page.getByRole("heading", { name: "Équipes" })).toBeVisible();
  await expect(page.getByText("Alpha Esports")).toBeVisible();
});

// Les regions se limitent a France et Autre (src/lib/constants.ts) : le test
// visait « DACH », qui n'existe plus et etait donc ignore par le filtre.
test("le filtre région France montre l'équipe, une autre région la masque", async ({ page }) => {
  await page.goto("/equipes?region=France");
  await expect(page.getByText("Alpha Esports")).toBeVisible();
  await page.goto("/equipes?region=Autre");
  await expect(page.getByText("Alpha Esports")).toHaveCount(0);
});

test("la page équipe affiche le nom et la section roster", async ({ page }) => {
  await page.goto("/equipes/seed-team-alpha");
  await expect(page.getByRole("heading", { name: /Alpha Esports/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Roster" })).toBeVisible();
});

test("une page admin redirige un visiteur non connecté", async ({ page }) => {
  // Non connecté, le backstop du proxy renvoie vers la connexion — avant tout
  // rendu — et non plus vers l'accueil comme le faisait le seul requireAdmin()
  // de la page. Un non-admin *connecté*, lui, retombe bien sur l'accueil
  // (couvert par admin.spec.ts).
  await page.goto("/admin/equipes");
  await expect(page).toHaveURL(/\/api\/auth\/signin/);
});

test("la fiche équipe montre la frise de forme récente", async ({ page }) => {
  // `fx-team-a` a cinq rencontres terminées dans les fixtures, dont trois avec
  // le détail des maps : de quoi éprouver à la fois les barres mesurées et le
  // repli quand l'écart de rounds n'est pas enregistré.
  await page.goto("/equipes/fx-team-a");

  const forme = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Forme récente" }) });
  await expect(forme).toHaveCount(1);

  // Une barre par rencontre, chacune menant à son match.
  await expect(forme.locator('a[href^="/matchs/"]')).toHaveCount(5);

  // Le sens porte le résultat indépendamment de la couleur : chaque barre
  // s'annonce en toutes lettres, sans quoi la frise ne dirait rien à qui ne
  // distingue pas le vert du rouge.
  const premiere = forme.locator('a[href^="/matchs/"]').first();
  await expect(premiere).toHaveAttribute("aria-label", /Victoire|Défaite|Sans vainqueur/);

  // La jumelle textuelle : une infobulle ne doit jamais être le seul chemin
  // vers une valeur.
  await expect(forme.locator("table tbody tr")).toHaveCount(5);
});
