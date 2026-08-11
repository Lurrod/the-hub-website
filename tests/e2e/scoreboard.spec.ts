import { test, expect, type Page } from "@playwright/test";

/*
 * Scoreboard, onglet cumulé et cartes de partage, sur le jeu de fixtures.
 *
 * Rien de tout cela n'était testable avant : aucun seed de la CI ne créait de
 * `PlayerGameStat`, donc aucun match n'avait de scoreboard et ces écrans
 * n'étaient jamais rendus. `prisma/seed-fixtures.ts` isole une situation par
 * match, et ces tests les citent par leur identifiant.
 */

const BO3 = "fx-m-bo3";
const PARTIEL = "fx-m-partiel";
const SANS_STATS = "fx-m-sans-stats";

/** Colonnes du tableau de scoreboard, dans l'ordre du rendu. */
const COL = { nom: 1, rating: 2, acs: 3, kills: 4, deaths: 5 } as const;

/** Lit une colonne chiffrée sur la ligne d'un joueur donné. */
async function cellule(page: Page, pseudo: string, colonne: number): Promise<number> {
  const ligne = page.locator("table tbody tr").filter({ hasText: pseudo }).first();
  return Number(await ligne.locator("td").nth(colonne).innerText());
}

test.describe("scoreboard d'une fiche match", () => {
  test("un Bo3 statté ouvre sur le cumul, suivi de ses maps", async ({ page }) => {
    await page.goto(`/matchs/${BO3}`);

    await expect(page.getByRole("tab")).toHaveText(["Toutes les maps", "Ascent", "Bind", "Lotus"]);
    // Le cumul est la vue par défaut : sur une rencontre en plusieurs maps,
    // c'est la lecture d'ensemble qu'on cherche d'abord.
    await expect(page.getByRole("tab", { selected: true })).toHaveText("Toutes les maps");
  });

  test("le cumul additionne réellement les maps", async ({ page }) => {
    await page.goto(`/matchs/${BO3}`);

    // On lit le cumul affiché, puis chaque map, et on compare. L'assertion ne
    // dépend d'aucun chiffre écrit en dur : elle vérifie la relation, donc
    // elle survit à un changement du jeu de fixtures.
    const cumul = await cellule(page, "AlphaJoueur0", COL.kills);

    let somme = 0;
    for (const map of ["Ascent", "Bind", "Lotus"]) {
      await page.getByRole("tab", { name: map }).click();
      await expect(page.getByRole("tab", { selected: true })).toHaveText(map);
      somme += await cellule(page, "AlphaJoueur0", COL.kills);
    }

    expect(cumul).toBe(somme);
  });

  test("un remplaçant n'est cumulé que sur les maps qu'il a jouées", async ({ page }) => {
    await page.goto(`/matchs/${BO3}`);

    // Il n'entre que sur la troisième map : son cumul doit valoir exactement
    // cette map, et pas davantage.
    const cumul = await cellule(page, "AlphaRemplacant", COL.kills);
    await page.getByRole("tab", { name: "Lotus" }).click();
    const surLotus = await cellule(page, "AlphaRemplacant", COL.kills);

    expect(cumul).toBe(surLotus);
  });

  test("une seule map stattée ne donne pas d'onglet cumulé", async ({ page }) => {
    await page.goto(`/matchs/${PARTIEL}`);

    const onglets = await page.getByRole("tab").allInnerTexts();
    expect(onglets).not.toContain("Toutes les maps");
  });

  test("un match sans scoreboard n'affiche aucun tableau", async ({ page }) => {
    await page.goto(`/matchs/${SANS_STATS}`);

    await expect(page.locator("table")).toHaveCount(0);
  });
});

test.describe("cartes de partage", () => {
  test("un Bo3 statté propose le résultat, chaque map, et la série", async ({ page }) => {
    await page.goto(`/matchs/${BO3}`);
    await page.getByRole("button", { name: "Partager" }).click();

    const dialog = page.getByRole("dialog", { name: "Partager le match" });
    await expect(dialog.getByRole("tab")).toHaveText([
      "Résultat",
      "Ascent",
      "Bind",
      "Lotus",
      "Bo3",
    ]);
  });

  test("changer de carte change l'aperçu et le nom du fichier", async ({ page }) => {
    await page.goto(`/matchs/${BO3}`);
    await page.getByRole("button", { name: "Partager" }).click();
    const dialog = page.getByRole("dialog");

    const lien = dialog.getByRole("link", { name: "Télécharger le PNG" });
    const avant = await lien.getAttribute("download");

    await dialog.getByRole("tab", { name: "Bind" }).click();
    await expect(lien).toHaveAttribute("download", /-bind\.png$/);
    expect(await lien.getAttribute("download")).not.toBe(avant);

    // L'aperçu de la nouvelle carte est réellement décodé, pas juste demandé.
    await expect
      .poll(() => dialog.getByRole("img").evaluate((i: HTMLImageElement) => i.naturalWidth))
      .toBe(1080);
  });

  test("les maps sans scoreboard ne sont pas proposées, et la série non plus", async ({ page }) => {
    await page.goto(`/matchs/${PARTIEL}`);
    await page.getByRole("button", { name: "Partager" }).click();

    // Seule la deuxième map est stattée : la première ne doit pas apparaître,
    // et une seule map ne justifie pas de carte de série.
    await expect(page.getByRole("dialog").getByRole("tab")).toHaveText(["Résultat", "Haven"]);
  });

  test("les routes de carte servent un PNG pour chaque vue", async ({ request }) => {
    for (const vue of ["", "?vue=map-1", "?vue=map-3", "?vue=serie"]) {
      const response = await request.get(`/matchs/${BO3}/carte${vue}`);
      expect(response.status(), vue).toBe(200);
      expect(response.headers()["content-type"], vue).toContain("image/png");
    }
  });

  test("une map sans scoreboard rend quand même sa carte", async ({ request }) => {
    // `map-1` du match partiel n'a aucune ligne : la carte doit sortir vide de
    // joueurs, pas en erreur.
    const response = await request.get(`/matchs/${PARTIEL}/carte?vue=map-1`);
    expect(response.status()).toBe(200);
    expect((await response.body()).byteLength).toBeGreaterThan(0);
  });
});

test.describe("roster", () => {
  test("les trois rôles d'encadrement portent leur pictogramme", async ({ page }) => {
    await page.goto("/equipes/fx-team-a");

    for (const role of ["Remplaçant", "Coach", "Manager"]) {
      await expect(page.getByRole("img", { name: role })).toBeVisible();
    }
  });
});

test.describe("page LFT", () => {
  test("le filtre par type ne garde que les profils demandés", async ({ page }) => {
    await page.goto("/lft?type=COACH");

    await expect(page.getByText("CoachDisponible")).toBeVisible();
    await expect(page.getByText("JoueurDisponible")).toHaveCount(0);
  });

  test("un coach libre s'affiche avec son type", async ({ page }) => {
    await page.goto("/lft?type=COACH");

    const carte = page.locator("a").filter({ hasText: "CoachDisponible" }).first();
    await expect(carte).toContainText("Coach");
  });
});

test.describe("alignement des liens réseaux", () => {
  // L'infobulle qui enveloppe chaque icône était un bloc en ligne : elle
  // construisait autour d'elle une ligne de texte, l'icône se posait sur la
  // ligne de base et laissait 5 px de talon sous elle. Elle paraissait donc
  // remonter de 2,5 px par rapport au titre qu'elle accompagne.
  for (const [nom, url] of [
    ["fiche joueur", "/joueurs/fx-a0"],
    ["fiche tournoi", "/tournois/fx-tournoi"],
  ] as const) {
    test(`les icônes sont centrées sur le titre — ${nom}`, async ({ page }) => {
      await page.goto(url);

      const ecart = await page.evaluate(() => {
        const titre = document.querySelector("h1")!;
        const rangee = titre.parentElement!;
        const icone = rangee.querySelector("a svg");
        if (!icone) return null;
        const r = rangee.getBoundingClientRect();
        const i = icone.getBoundingClientRect();
        return i.top + i.height / 2 - (r.top + r.height / 2);
      });

      expect(ecart, "aucune icône trouvée").not.toBeNull();
      expect(Math.abs(ecart!)).toBeLessThan(1);
    });
  }
});
