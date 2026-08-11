import { test, expect } from "@playwright/test";

// Matchs et joueurs du jeu de démonstration des formats
// (prisma/seed-formats.ts et le seed VLR EMEA).
const MATCH = "fmt-single-elim-m-qf1";
const JOUEUR = "vlr-p-vlr-vit-3";

test("la fiche match propose de partager une carte téléchargeable", async ({ page }) => {
  await page.goto(`/matchs/${MATCH}`);

  await page.getByRole("button", { name: "Partager" }).click();

  const dialog = page.getByRole("dialog", { name: "Partager le match" });
  await expect(dialog).toBeVisible();

  // L'aperçu doit réellement être décodé par le navigateur : un `toBeVisible`
  // passerait aussi sur une image cassée.
  const apercu = dialog.getByRole("img");
  await expect.poll(() => apercu.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1080);

  await expect(dialog.getByRole("link", { name: "Télécharger le PNG" })).toHaveAttribute(
    "download",
    /^the-hub-.+\.png$/
  );
  await expect(dialog.getByRole("button", { name: "Copier le lien" })).toBeVisible();
});

test("la boîte de partage se ferme à Échap et rend le focus au bouton", async ({ page }) => {
  await page.goto(`/matchs/${MATCH}`);

  const bouton = page.getByRole("button", { name: "Partager" });
  await bouton.click();
  await expect(page.getByRole("dialog")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(bouton).toBeFocused();
});

// Aucun jeu de données de la CI ne produit de `PlayerGameStat` : les cartes de
// scoreboard n'ont donc pas de match à cibler ici. La construction de la liste
// des variantes est couverte à part, dans tests/unit/og-share-variants.test.ts.
test("sans scoreboard importé, la boîte ne propose aucun choix de carte", async ({ page }) => {
  await page.goto(`/matchs/${MATCH}`);
  await page.getByRole("button", { name: "Partager" }).click();

  const dialog = page.getByRole("dialog", { name: "Partager le match" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("tablist")).toBeHidden();
});

// Le bouton s'insère dans le bas du bandeau, déjà chargé (tournoi, date,
// stage, format). Avec son libellé, la ligne débordait de 15 px sur un écran
// de 390 px et faisait défiler la page entière à l'horizontale.
test("le bandeau de match ne déborde pas en largeur sur mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/matchs/${MATCH}`);
  await expect(page.getByRole("button", { name: "Partager" })).toBeVisible();

  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
});

test("une vue inconnue retombe sur la carte de résultat", async ({ request }) => {
  const [resume, inconnue] = await Promise.all([
    request.get(`/matchs/${MATCH}/carte`),
    request.get(`/matchs/${MATCH}/carte?vue=map-99`),
  ]);
  expect(inconnue.status()).toBe(200);
  expect((await inconnue.body()).equals(await resume.body())).toBe(true);
});

test("la fiche joueur propose la même carte", async ({ page }) => {
  await page.goto(`/joueurs/${JOUEUR}`);

  await page.getByRole("button", { name: "Partager" }).click();
  await expect(page.getByRole("dialog", { name: "Partager la fiche" })).toBeVisible();
});

test("les routes de carte servent un PNG carré, et 404 sur une entité inconnue", async ({
  request,
}) => {
  for (const url of [`/matchs/${MATCH}/carte`, `/joueurs/${JOUEUR}/carte`]) {
    const response = await request.get(url);
    expect(response.status(), url).toBe(200);
    expect(response.headers()["content-type"], url).toContain("image/png");
    expect((await response.body()).byteLength, url).toBeGreaterThan(0);
  }

  expect((await request.get("/matchs/inconnu/carte")).status()).toBe(404);
  expect((await request.get("/joueurs/inconnu/carte")).status()).toBe(404);
});
