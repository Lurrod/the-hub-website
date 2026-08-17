import { test, expect } from "@playwright/test";

// Une fiche inexistante répondait 200 : le rendu dynamique streame la coquille
// (loading.tsx) avant que `notFound()` ne soit atteint, et le statut ne peut
// plus changer. Le proxy vérifie désormais l'existence AVANT le rendu et
// répond 404 — un vrai, pas un soft-404 signalé par la Search Console.
for (const path of [
  "/tournois/id-inexistant-e2e",
  "/equipes/id-inexistant-e2e",
  "/joueurs/id-inexistant-e2e",
  "/matchs/id-inexistant-e2e",
]) {
  test(`fiche inexistante ${path} répond 404`, async ({ request }) => {
    const res = await request.get(path);
    expect(res.status()).toBe(404);
  });
}

test("une fiche existante répond toujours 200", async ({ request }) => {
  const res = await request.get("/tournois/fmt-single-elim");
  expect(res.status()).toBe(200);
});
