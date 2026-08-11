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

    const mesures = await page.evaluate(() => {
      const meta = document.querySelector("h1")!.parentElement!.nextElementSibling!;
      const taille = (el: Element | null) => (el ? getComputedStyle(el).fontSize : null);
      const boite = (el: Element | null) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return `${Math.round(r.width)}x${Math.round(r.height)}`;
      };
      return {
        equipe: taille(meta.querySelector("a span.text-white")),
        age: taille(meta.querySelector("span.stat")),
        monogramme: boite(meta.querySelector("span.monogram")),
        roleIcone: boite(meta.querySelector("img.h-4")),
      };
    });

    expect(mesures.equipe).toBe("14px");
    expect(mesures.age).toBe("14px");
    // Les pastilles gardent leur gabarit : seul le texte grandit.
    expect(mesures.monogramme).toBe("16x16");
    expect(mesures.roleIcone).toBe("16x16");
  });
});
