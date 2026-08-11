import { test, expect } from "@playwright/test";

test("la page profil montre le joueur, son équipe actuelle et son parcours", async ({ page }) => {
  await page.goto("/joueurs/seed-player-neo");
  await expect(page.getByRole("heading", { name: "Neo" })).toBeVisible();
  await expect(page.getByText("Alpha Esports").first()).toBeVisible();
  // « Historique d'equipes » est devenu l'onglet « Equipes ».
  await expect(page.getByRole("link", { name: "Équipes", exact: true })).toBeVisible();
});

test("la page équipe affiche le roster avec le joueur", async ({ page }) => {
  await page.goto("/equipes/seed-team-alpha");
  await expect(page.getByRole("heading", { name: "Roster" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Neo" })).toBeVisible();
});

// La gestion de roster a quitte /admin pour /equipes/<id>/gestion/roster. Un
// visiteur sans session y est renvoye vers la connexion par le backstop de
// src/proxy.ts, avec l'URL demandee en callback.
test("la gestion de roster renvoie un visiteur non connecté vers la connexion", async ({
  page,
}) => {
  await page.goto("/equipes/seed-team-alpha/gestion/roster");
  await expect(page).toHaveURL(/\/api\/auth\/signin/);
});

test.describe("en-tête de fiche joueur", () => {
  // La contrainte typographique globale de components.css n'est pas dans un
  // `@layer` et prime sur les utilitaires : une taille posée par une classe y
  // est silencieusement ramenée à 12 px. Ces tailles-ci sont donc posées en
  // ligne, et ce test veille à ce qu'elles le restent.
  test("les textes sous le pseudo sont à 14 px, sans toucher aux icônes", async ({ page }) => {
    await page.goto("/joueurs/fx-a0");

    const meta = page.locator("h1").locator("xpath=../following-sibling::div[1]");
    const equipe = meta.locator("a span.text-white");
    const age = meta.locator("span.stat");
    const monogramme = meta.locator("span.monogram");
    const roleIcone = meta.locator("img.h-4");

    // `toBeVisible` patiente que la mise en page soit posée. Sans cette
    // attente, la mesure pouvait tomber avant l'application des feuilles et
    // lire une boîte vide — ce qui a fait échouer ce test en CI, sur une
    // machine plus lente que le poste de développement.
    await expect(monogramme).toBeVisible();
    await expect(roleIcone).toBeVisible();

    await expect(equipe).toHaveCSS("font-size", "14px");
    await expect(age).toHaveCSS("font-size", "14px");

    // Les pastilles gardent leur gabarit : seul le texte grandit.
    for (const icone of [monogramme, roleIcone]) {
      await expect(icone).toHaveCSS("width", "16px");
      await expect(icone).toHaveCSS("height", "16px");
    }
  });
});
