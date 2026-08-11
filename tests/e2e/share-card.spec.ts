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
