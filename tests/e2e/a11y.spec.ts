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
  { path: "/equipes", name: "liste des équipes" },
  { path: "/tournois", name: "liste des tournois" },
  { path: "/matchs", name: "liste des matchs" },
  { path: "/lft", name: "LFT / LFP" },
  { path: "/premier", name: "page Premier" },
  { path: "/rating", name: "page Rating" },
  { path: "/recherche", name: "recherche" },
  { path: "/tournois/fmt-league", name: "fiche tournoi" },
  { path: "/matchs/fmt-groups-elim-m-a-1", name: "fiche match" },
  { path: "/equipes/fx-team-a", name: "fiche équipe" },
  { path: "/joueurs/fx-a0", name: "fiche joueur" },
  { path: "/cgu", name: "CGU" },
  { path: "/confidentialite", name: "politique de confidentialité" },
  { path: "/mentions-legales", name: "mentions légales" },
  { path: "/introuvable", name: "page 404" },
];

/**
 * Deux largeurs.
 *
 * Le scan ne tournait qu'en 1280 px : les zones à défilement horizontal n'y
 * débordent jamais, et la règle `scrollable-region-focusable` ne pouvait donc
 * pas se déclencher — six conteneurs sont passés au travers jusqu'à l'audit.
 * 390 px est la largeur de référence des téléphones courants, et c'est aussi
 * là que le pied de page bascule sur deux rangées.
 */
const LARGEURS = [
  { width: 1280, height: 900, name: "bureau" },
  { width: 390, height: 844, name: "téléphone" },
];

/**
 * Règles écartées, avec leur raison. Toute entrée ici est une dette assumée,
 * pas un faux positif : elle doit disparaître quand le finding est corrigé.
 *
 * `color-contrast` a été retiré de cette liste : les deux jetons qui le
 * faisaient échouer sont remontés au-dessus de 4,5:1 sur tous les fonds du
 * site (--accent-foreground sur les boutons d'accent, --text-subtle à
 * #909298). La règle est de nouveau active, et c'est elle qui empêchera la
 * dérive de reprendre — la laisser éteinte après correction revenait à
 * repartir pour un an.
 */
const DISABLED_RULES: string[] = [];

for (const { path, name } of PAGES) {
  for (const taille of LARGEURS) {
    test(`aucune violation d'accessibilité sérieuse sur ${name} (${taille.name})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: taille.width, height: taille.height });
      // Mouvement réduit : les listes entrent par `.stagger-in`, une animation de
      // fondu échelonnée jusqu'à ~0,2 s. axe mesurait le contraste pendant que
      // l'opacité montait encore et remontait de fausses violations — d'où des
      // échecs qui passaient au réessai. Ce réglage est une configuration
      // utilisateur réelle, que le site honore déjà (components.css:337-361) :
      // on scanne donc l'état posé, celui que tout le monde finit par voir.
      await page.emulateMedia({ reducedMotion: "reduce" });
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
}
