import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// eslint-config-next 16 publie directement des tableaux au format plat : ni
// FlatCompat ni .eslintrc ne sont nécessaires.
//
// Aucune règle de Next n'est désactivée ici. En particulier
// `@next/next/no-img-element` reste active : les commentaires
// `eslint-disable-next-line` déjà présents dans le code redeviennent donc
// effectifs, et toute nouvelle balise <img> devra être justifiée au cas par
// cas plutôt que passer inaperçue.
const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "test-results/**",
      "playwright-report/**",
      "coverage/**",
      "audit/**",
      ".ds-sync/**",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // Durcissement : aucune trace libre, la journalisation passe par
    // src/lib/logger.ts.
    rules: { "no-console": "error" },
  },
  {
    // Seul point de sortie assumé vers la console.
    files: ["src/lib/logger.ts"],
    rules: { "no-console": "off" },
  },
  {
    // Scripts d'amorçage et de maintenance : lancés à la main, la sortie
    // console y est le mode d'expression normal.
    files: ["prisma/**/*.ts", "scripts/**/*.{ts,mjs}"],
    rules: { "no-console": "off" },
  },
];

// Nommé plutôt qu'anonyme : ESLint signale les exports par défaut sans identifiant.
export default config;
