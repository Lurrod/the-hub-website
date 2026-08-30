import { test, expect } from "@playwright/test";

// Le jeu de donnees de dev ne contient plus que les tournois de demonstration
// des formats (prisma/seed-formats.ts, `npm run db:seed:formats`).
const TOURNOI = "Hub Invitational - Élimination directe";

test("l'annuaire des tournois affiche le tournoi de démo", async ({ page }) => {
  await page.goto("/tournois");
  await expect(page.getByRole("heading", { name: "Tournois" })).toBeVisible();
  await expect(page.getByText(TOURNOI).first()).toBeVisible();
});

test("la page tournoi affiche l'en-tête et l'équipe inscrite", async ({ page }) => {
  await page.goto("/tournois/fmt-single-elim");
  await expect(page.getByRole("heading", { name: TOURNOI })).toBeVisible();
  await expect(page.getByText("Team Heretics").first()).toBeVisible();
  // Anciennement « Equipes inscrites ».
  await expect(page.getByRole("heading", { name: "Équipes participantes" })).toBeVisible();
});

// Le bandeau de l'aperçu s'arrêtait à quatre résultats, quel que soit l'espace
// disponible : sur un tournoi Premier, quatre lignes sur les dizaines jouées ne
// disaient rien. C'est désormais la hauteur de la colonne qui décide, et rien
// d'autre — pas de barre de défilement, pas de ligne coupée en deux.
//
// Le compte exact n'est donc plus assertable : il dépend de la hauteur du
// contenu voisin, qui varie avec le tournoi et la fenêtre. Ce sont les deux
// invariants qui comptent, et ils sont plus solides qu'un nombre.
test("le bandeau de l'aperçu se règle sur sa hauteur, sans défiler ni déborder", async ({
  page,
}) => {
  await page.goto("/tournois/fmt-round-robin");
  const resultats = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Derniers résultats" }) });
  const lignes = resultats.locator("li");

  // Invariant 1 : le plafond de quatre a bien sauté. Le round robin de démo
  // compte quinze matchs joués, et la colonne en montre plus de quatre.
  //
  // Une assertion qui retente, et non `count()` : le second prend un instantané
  // sans réessayer et lisait le document avant le rendu — il rendait zéro. La
  // cinquième ligne visible suffit à prouver que le plafond a sauté.
  await expect(lignes.nth(4)).toBeVisible();

  // Invariant 2 : rien ne dépasse et rien ne défile.
  //
  // Une assertion qui retente, et sur le débordement en pixels plutôt que sur un
  // booléen : le rendu du serveur envoie toutes les lignes, que la boîte rogne,
  // et c'est la mesure côté client qui tranche ensuite combien en garder. Lire
  // une seule fois attrapait l'état intermédiaire — et un booléen n'aurait pas
  // dit de combien on dépassait.
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const boite = document.querySelector("h2")?.closest("div.relative")?.firstElementChild;
        const derniere = [...(boite?.querySelectorAll("li") ?? [])].pop();
        if (!boite || !derniere) return null;
        return Math.round(
          derniere.getBoundingClientRect().bottom - boite.getBoundingClientRect().bottom
        );
      })
    )
    .toBeLessThanOrEqual(0);

  // Et aucun contenu caché derrière une barre de défilement.
  const cache = await page.evaluate(() => {
    const boite = document.querySelector("h2")?.closest("div.relative")?.firstElementChild;
    return boite ? boite.scrollHeight - boite.clientHeight : null;
  });
  expect(cache).toBeLessThanOrEqual(1);
});

test("la page admin tournois redirige un visiteur non connecté", async ({ page }) => {
  // Non connecté : redirection vers la connexion par le backstop du proxy,
  // désormais actif sur /admin comme sur /gestion.
  await page.goto("/admin/tournois");
  await expect(page).toHaveURL(/\/api\/auth\/signin/);
});
