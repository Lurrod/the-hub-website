import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "html", "lcov"],
      reportsDirectory: "coverage",
      // Seule la logique testable sans navigateur ni base est MESURÉE ici.
      //
      // Les server actions ne sont pas dans ce périmètre, mais elles sont
      // désormais testées : `tests/unit/actions-authorization.test.ts` verrouille
      // la matrice d'autorisation (qui peut supprimer, qui peut distribuer les
      // droits), la seule partie où une erreur est silencieuse. Les inclure
      // dans le calcul ferait tomber le total à ~59 % — l'essentiel de leur
      // corps est de la plomberie de redirection, couverte par les parcours
      // Playwright. Mélanger les deux rendrait le cliquet illisible.
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/db.ts", "src/lib/auth.ts", "src/lib/data/**"],
      // Seuils calés sur le niveau réellement atteint, pas sur un objectif :
      // ils servent de cliquet — la couverture ne peut plus baisser sans
      // faire échouer la CI. À relever au fur et à mesure.
      //
      // La cible de 80 % d'instructions est tenue depuis la campagne de
      // couverture du finding QUAL-02 (tournament-teams-core, metadata, maps,
      // le recalage de statut, deleteStoredImage et les données structurées de
      // liste). Ce qui reste à zéro demande de la plomberie de test :
      // match-stats.ts (API Riot + base), server-auth.ts et session.ts
      // (session Auth.js), countries.ts (table de données pure).
      thresholds: { statements: 84, branches: 79, functions: 88, lines: 85 },
    },
  },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
