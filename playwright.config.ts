import { defineConfig } from "@playwright/test";

// En CI on éprouve le build réellement déployé ; en local on garde le serveur
// de développement, avec réutilisation d'une instance déjà lancée.
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "tests/e2e",
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [["html", { open: "never" }], ["list"]] : [["list"]],
  use: { baseURL: "http://localhost:3200" },
  webServer: {
    command: isCI ? "npm run start" : "npm run dev",
    url: "http://localhost:3200",
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
