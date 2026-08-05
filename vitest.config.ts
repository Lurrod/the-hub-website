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
      // Seule la logique testable sans navigateur ni base est mesurée : les
      // composants React, les server actions et les pages relèvent des tests
      // end-to-end Playwright, pas de vitest (environnement "node").
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/db.ts", "src/lib/auth.ts", "src/lib/data/**"],
      // Seuils calés sur le niveau réellement atteint, pas sur un objectif :
      // ils servent de cliquet — la couverture ne peut plus baisser sans
      // faire échouer la CI. À relever au fur et à mesure ; la cible reste
      // 80 %, elle demande de couvrir bracket.ts, standings.ts et
      // match-stats.ts plus finement.
      thresholds: { statements: 68, branches: 63, functions: 71, lines: 69 },
    },
  },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
