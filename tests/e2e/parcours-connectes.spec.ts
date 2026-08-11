import { test, expect } from "@playwright/test";
import { createAccount, disconnect, readPlayer, signIn, type TestAccount } from "./session";

/*
 * Parcours qui exigent d'être connecté. Ils n'étaient couverts que par leur
 * refus d'accès aux visiteurs anonymes : on vérifiait qu'une page de gestion
 * redirige, jamais qu'elle fonctionne.
 */

const comptes: TestAccount[] = [];

/** Crée un compte et programme sa suppression, quoi qu'il advienne du test. */
async function compte(...args: Parameters<typeof createAccount>) {
  const account = await createAccount(...args);
  comptes.push(account);
  return account;
}

test.afterAll(async () => {
  for (const c of comptes) await c.cleanup();
  await disconnect();
});

test.describe("gate d'inscription", () => {
  test("un compte dont l'inscription n'est pas finie est renvoyé vers /onboarding", async ({
    context,
    page,
  }) => {
    const account = await compte({ onboarded: false });
    await signIn(context, account, { onboarded: false });

    await page.goto("/joueurs");
    await expect(page).toHaveURL(/\/onboarding$/);
  });

  test("un compte déjà inscrit circule librement", async ({ context, page }) => {
    const account = await compte({ onboarded: true });
    await signIn(context, account);

    await page.goto("/joueurs");
    await expect(page).toHaveURL(/\/joueurs$/);
  });

  test("les pages légales restent atteignables avant la fin de l'inscription", async ({
    context,
    page,
  }) => {
    const account = await compte({ onboarded: false });
    await signIn(context, account, { onboarded: false });

    await page.goto("/cgu");
    await expect(page).toHaveURL(/\/cgu$/);
  });
});

test.describe("inscription", () => {
  test("le formulaire s'adapte au type de compte choisi", async ({ context, page }) => {
    const account = await compte({ onboarded: false });
    await signIn(context, account, { onboarded: false });
    await page.goto("/onboarding");

    // Joueur : le Riot ID est exigé, et le rôle Valorant est proposé.
    await expect(page.locator('input[name="riotId"]')).toHaveAttribute("required", "");
    await expect(page.locator('select[name="valorantRole"]')).toBeVisible();

    // Coach : le Riot ID devient facultatif, le rôle Valorant disparaît. Il
    // n'est pas seulement masqué — il n'est plus rendu, donc rien ne part.
    await page.locator('input[value="COACH"]').check();
    await expect(page.locator('input[name="riotId"]')).not.toHaveAttribute("required", "");
    await expect(page.locator('select[name="valorantRole"]')).toHaveCount(0);
  });

  test("un coach termine son inscription sans Riot ID", async ({ context, page }) => {
    const account = await compte({ onboarded: false });
    await signIn(context, account, { onboarded: false });

    await page.goto("/onboarding");
    await page.locator('input[value="COACH"]').check();
    await page.getByRole("button", { name: "Valider et continuer" }).click();

    // Le gate doit s'ouvrir : sans Riot ID, c'est `onboardedAt` qui le prouve.
    await expect(page).toHaveURL(/\/\?ok=onboarding-done$/);
    await expect.poll(async () => (await readPlayer(account.playerId))?.accountType).toBe("COACH");
    await expect.poll(async () => (await readPlayer(account.playerId))?.onboardedAt).not.toBeNull();

    // Et l'accès au site est réellement débloqué.
    await page.goto("/joueurs");
    await expect(page).toHaveURL(/\/joueurs$/);
  });

  test("un joueur ne peut pas terminer sans Riot ID", async ({ context, page }) => {
    const account = await compte({ onboarded: false });
    await signIn(context, account, { onboarded: false });

    await page.goto("/onboarding");
    // Le champ est `required` : le navigateur bloque avant l'envoi. On retire
    // l'attribut pour éprouver la garde côté serveur, la seule qui compte —
    // un formulaire se contourne, pas une action.
    await page.locator('input[name="riotId"]').evaluate((el) => el.removeAttribute("required"));
    await page.getByRole("button", { name: "Valider et continuer" }).click();

    await expect(page).toHaveURL(/\/onboarding\?error=riotformat$/);
    expect((await readPlayer(account.playerId))?.onboardedAt).toBeNull();
  });
});

test.describe("paramètres", () => {
  test("le type de compte se change et se conserve", async ({ context, page }) => {
    const account = await compte({ onboarded: true });
    await signIn(context, account);

    await page.goto("/profil");
    await page.locator('input[value="MANAGER"]').check();
    await page.getByRole("button", { name: "Enregistrer" }).click();

    await expect
      .poll(async () => (await readPlayer(account.playerId))?.accountType)
      .toBe("MANAGER");

    // Le choix est rejoué au rechargement, et le rôle Valorant reste masqué.
    await page.goto("/profil");
    await expect(page.locator('input[value="MANAGER"]')).toBeChecked();
    await expect(page.locator('select[name="valorantRole"]')).toHaveCount(0);
  });
});
