import { defineConfig } from "@playwright/test";

// En CI on éprouve le build réellement déployé ; en local on garde le serveur
// de développement, avec réutilisation d'une instance déjà lancée.
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "tests/e2e",
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [["html", { open: "never" }], ["list"]] : [["list"]],
  use: {
    baseURL: "http://localhost:3200",
    // Sans elles, le rapport téléversé par la CI ne contient qu'un message et
    // une pile : un échec qui ne se reproduit qu'en CI — le cas courant, entre
    // l'hôte de confiance, les seeds et le fuseau — se débogue à l'aveugle.
    // `on-first-retry` profite du `retries: 1` déjà posé plus haut.
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: isCI ? "npm run start" : "npm run dev",
    url: "http://localhost:3200",
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
