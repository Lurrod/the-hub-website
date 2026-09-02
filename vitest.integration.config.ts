import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Tests d'intégration : `src/lib/data/**` contre un vrai PostgreSQL.
 *
 * Ce dossier est exclu du périmètre de couverture unitaire — il touche Prisma
 * et ne peut pas se tester sans base. L'exclusion était légitime, mais elle
 * laissait 4 700 lignes sans aucun filet : les seules à les exercer étaient les
 * parcours Playwright, indirectement et sur les chemins nominaux. Or c'est là
 * que vivent les fonctions les plus dangereuses du dépôt — suppressions en
 * cascade, transactions Serializable, rattachement automatique d'équipes.
 *
 * Config séparée et non un second `include` : ces tests exigent une base et ne
 * doivent pas casser `npm test`, qui doit rester exécutable partout et en
 * quelques secondes.
 *
 * DATABASE_URL doit pointer une base DÉDIÉE. Le harnais efface les tables entre
 * chaque test : le faire tourner sur la base de développement l'anéantirait.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    setupFiles: ["tests/integration/setup.ts"],
    // Les tests partagent une base : les exécuter en parallèle les ferait se
    // marcher dessus au nettoyage.
    fileParallelism: false,
    env: { TZ: "UTC" },
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
