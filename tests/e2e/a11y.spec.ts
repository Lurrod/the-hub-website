import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Contrôle d'accessibilité automatisé (finding CI-01 de l'audit du 6 août 2026).
 *
 * Les cinq écarts WCAG relevés par cet audit étaient tous reproductibles sans
 * authentification : un scan axe sur les pages principales les aurait signalés
 * avant la mise en production. C'est ce que cette spécification rétablit.
 *
 * Elle échoue sur les violations d'impact `serious` et `critical` uniquement :
 * `moderate` et `minor` remontent quantité de recommandations de confort que
 * l'on ne veut pas voir bloquer une livraison.
 */
const PAGES = [
  { path: "/", name: "accueil" },
  { path: "/joueurs", name: "annuaire des joueurs" },
  { path: "/tournois", name: "liste des tournois" },
  { path: "/premier", name: "page Premier" },
  { path: "/tournois/fmt-league", name: "fiche tournoi" },
  { path: "/matchs/fmt-groups-elim-m-a-1", name: "fiche match" },
];

/**
 * Règles écartées, avec leur raison. Toute entrée ici est une dette assumée,
 * pas un faux positif : elle doit disparaître quand le finding est corrigé.
 *
 * - `color-contrast` : findings A11Y-01 (bouton « Connexion Discord », 3.36:1)
 *   et A11Y-02 (jeton --text-subtle, 3.5:1). Les deux se corrigent en changeant
 *   une couleur de la charte — un arbitrage visuel, pas une correction
 *   technique. Retirer cette exclusion dès que les deux jetons sont remontés.
 */
const DISABLED_RULES = ["color-contrast"];

for (const { path, name } of PAGES) {
  test(`aucune violation d'accessibilité sérieuse sur ${name}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .disableRules(DISABLED_RULES)
      .analyze();

    const blocking = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical"
    );

    // Le message porte la règle, son impact et le premier sélecteur fautif :
    // sans cela, l'échec en CI n'indique pas quoi corriger.
    expect(
      blocking.map((v) => `${v.id} (${v.impact}) — ${v.nodes[0]?.target.join(" ")}`),
      `Violations bloquantes sur ${path}`
    ).toEqual([]);
  });
}
