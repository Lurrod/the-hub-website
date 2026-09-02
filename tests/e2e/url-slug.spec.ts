import { test, expect } from "@playwright/test";

/**
 * URLs de fiche lisibles, et leur redirection.
 *
 * Trois choses doivent tenir ensemble, sans quoi le référencement se dégrade
 * en silence : le sitemap n'annonce que des destinations finales, l'ancienne
 * forme redirige en permanence vers la nouvelle, et la nouvelle ne redirige
 * pas — une divergence d'un seul caractère entre le canonique et la cible de
 * redirection ferait boucler chaque fiche indéfiniment.
 */

test("le sitemap, la redirection et le canonique disent la même URL", async ({ page, request }) => {
  // Identifiant nu d'une fiche réelle, pris dans le sitemap.
  const xml = await (await request.get("/sitemap.xml")).text();
  const url = /<loc>([^<]*\/tournois\/[^<]+)<\/loc>/.exec(xml)?.[1];
  expect(url).toBeTruthy();
  const segment = url!.split("/").pop()!;
  expect(segment).toContain("--");

  const id = segment.slice(segment.indexOf("--") + 2);
  const r = await request.get(`/tournois/${id}`, { maxRedirects: 0 });
  expect(r.status()).toBe(301);
  expect(r.headers()["location"]).toContain(segment);

  // Et la forme canonique ne redirige pas : pas de boucle.
  const c = await request.get(`/tournois/${segment}`, { maxRedirects: 0 });
  expect(c.status()).toBe(200);

  await page.goto(`/tournois/${segment}`);
  const canon = await page.locator('link[rel="canonical"]').getAttribute("href");
  expect(canon).toContain(segment);
});
