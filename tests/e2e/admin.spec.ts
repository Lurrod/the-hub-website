import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { PrismaClient } from "@prisma/client";
import { createAccount, signIn, disconnect, type TestAccount } from "./session";

const db = new PrismaClient();

test.afterAll(async () => {
  await db.$disconnect();
  await disconnect();
});

/**
 * Compte d'administration jetable.
 *
 * `createAccount` ne sait pas poser `globalRole` : c'est un helper de parcours
 * joueur. Le promouvoir ici évite de charger le helper partagé d'un besoin
 * propre à cette spécification.
 */
async function compteAdmin(): Promise<TestAccount> {
  const compte = await createAccount({ onboarded: true });
  await db.user.update({ where: { id: compte.userId }, data: { globalRole: "ADMIN" } });
  return compte;
}

test("un non-admin est renvoyé hors de l'administration", async ({ page, context }) => {
  const compte = await createAccount({ onboarded: true });
  try {
    await signIn(context, compte);
    await page.goto("/admin");
    await page.waitForURL("/");
    await expect(page).not.toHaveURL(/\/admin/);
  } finally {
    await compte.cleanup();
  }
});

test("le tableau de bord affiche ses trois étages", async ({ page, context }) => {
  const compte = await compteAdmin();
  try {
    await signIn(context, compte);
    await page.goto("/admin");

    await expect(page.getByRole("heading", { level: 2, name: "À traiter" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Activité récente" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Chiffres" })).toBeVisible();
  } finally {
    await compte.cleanup();
  }
});

test("la recherche filtre la liste des équipes", async ({ page, context }) => {
  const compte = await compteAdmin();
  try {
    await signIn(context, compte);

    await page.goto("/admin/equipes");
    await expect(page.locator("main ul li").first()).toBeVisible();

    await page.getByPlaceholder("Nom ou tag").fill("Fixture Alpha");
    await page.getByRole("button", { name: "Rechercher" }).click();

    await expect(page).toHaveURL(/q=Fixture\+Alpha/);
    // `toHaveCount` et non `count()` : le second prend un instantané sans
    // réessayer, et `toHaveURL` réussit dès que l'URL change — le comptage
    // lisait le document avant que la nouvelle liste soit rendue.
    //
    // Un compte exact plutôt qu'une comparaison au total : une seule équipe des
    // fixtures porte ce nom, dans tous les environnements.
    await expect(page.locator("main ul li")).toHaveCount(1);
    await expect(page.getByText("Fixture Alpha")).toBeVisible();
  } finally {
    await compte.cleanup();
  }
});

test("aucune violation d'accessibilité sérieuse sur le tableau de bord", async ({
  page,
  context,
}) => {
  // Le scan vit ici et non dans a11y.spec.ts : celui-ci navigue sans session,
  // et /admin y renverrait vers l'accueil — on aurait scanné la page d'accueil
  // en croyant couvrir l'administration.
  const compte = await compteAdmin();
  try {
    await signIn(context, compte);
    await page.goto("/admin");

    // `color-contrast` est écartée pour la même raison que dans a11y.spec.ts :
    // les écarts A11Y-01 et A11Y-02 sont des arbitrages de charte, pas des
    // défauts de cette page. Toute autre exclusion serait une dette nouvelle.
    const resultats = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
    const bloquantes = resultats.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical"
    );
    expect(bloquantes.map((v) => `${v.id} — ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
  } finally {
    await compte.cleanup();
  }
});

test("la page des doublons rapproche la paire des fixtures", async ({ page, context }) => {
  const compte = await compteAdmin();
  // La mise à l'écart est persistée : sans ce nettoyage, un test qui échoue
  // après le clic laisserait la paire écartée et ferait échouer tous les
  // suivants sans qu'on comprenne pourquoi.
  const nettoyerEcart = () =>
    db.teamDuplicateDismissal.deleteMany({ where: { miroirId: "fx-doublon-miroir" } });
  try {
    await nettoyerEcart();
    await signIn(context, compte);
    await page.goto("/admin/doublons");

    // Le suffixe « Esports » ne doit pas empêcher le rapprochement : les deux
    // fiches portent le même tag et le même radical.
    const paire = page.locator("main section ul li").filter({ hasText: "Fixture Delta" });
    await expect(paire).toHaveCount(1);
    await expect(paire.getByText("Fixture Delta Esports")).toBeVisible();

    await paire.getByRole("button", { name: "Ce n'est pas un doublon" }).click();

    // Écartée, elle quitte les propositions et rejoint la liste des écartés.
    await expect(page.getByRole("heading", { level: 2, name: /^Écartés/ })).toBeVisible();
    await expect(
      page.locator("main section ul li").filter({ hasText: "Fixture Delta Esports" })
    ).toHaveCount(1);

    await page.getByRole("button", { name: "Reproposer" }).first().click();
    await expect(page.getByRole("heading", { level: 2, name: /^Écartés/ })).toHaveCount(0);
  } finally {
    await nettoyerEcart();
    await compte.cleanup();
  }
});

test("aucune violation d'accessibilité sérieuse sur les pages de doublons", async ({
  page,
  context,
}) => {
  // Les deux pages portent l'essentiel des commandes de la section : cases à
  // cocher sans étiquette visible et boutons multiples dans un même formulaire.
  const compte = await compteAdmin();
  try {
    await signIn(context, compte);
    for (const chemin of ["/admin/doublons", "/admin/doublons/fusion"]) {
      await page.goto(chemin);
      const resultats = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
      const bloquantes = resultats.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical"
      );
      expect(bloquantes.map((v) => `${chemin} — ${v.id}`)).toEqual([]);
    }
  } finally {
    await compte.cleanup();
  }
});

test("le tableau de bord mène aux sections et à leurs formulaires de création", async ({
  page,
  context,
}) => {
  // Régression du 2026-08-29 : la refonte du tableau de bord avait emporté la
  // grille de cartes, seule navigation vers les sections. Les formulaires
  // existaient toujours mais plus rien n'y menait, et créer une équipe ou un
  // tournoi à la main demandait de connaître l'URL par cœur.
  const compte = await compteAdmin();
  try {
    await signIn(context, compte);
    await page.goto("/admin");

    // Portée au `main` : la barre de navigation porte les mêmes libellés, et
    // c'est bien la présence dans le tableau de bord qui est en cause.
    const gerer = page.locator("main");
    for (const section of ["Tournois", "Équipes", "Joueurs", "Doublons"]) {
      await expect(gerer.getByRole("link", { name: section, exact: true })).toBeVisible();
    }

    await page.getByRole("link", { name: "Nouvelle équipe" }).click();
    await page.waitForURL("**/admin/equipes/nouvelle");
    await expect(page.getByRole("button", { name: "Créer l'équipe" })).toBeVisible();

    await page.goto("/admin");
    await page.getByRole("link", { name: "Nouveau tournoi" }).click();
    await page.waitForURL("**/admin/tournois/nouvelle");
    await expect(page.getByRole("button", { name: "Créer le tournoi" })).toBeVisible();

    // Les joueurs se créent sur la page de liste : le lien doit y mener et le
    // formulaire s'y trouver.
    await page.goto("/admin");
    await page.locator("main").getByRole("link", { name: "Joueurs", exact: true }).click();
    await page.waitForURL("**/admin/joueurs");
    await expect(page.getByRole("heading", { name: "Nouveau joueur" })).toBeVisible();
  } finally {
    await compte.cleanup();
  }
});
