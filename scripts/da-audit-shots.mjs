import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

mkdirSync("da-shots", { recursive: true });

const routes = [
  ["home", "/"],
  ["tournois", "/tournois"],
  ["tournoi", "/tournois/vct-emea-stage1"],
  ["equipes", "/equipes"],
  ["match", "/matchs/vct-m-1"],
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

for (const [name, path] of routes) {
  await page.goto("http://localhost:3200" + path, { waitUntil: "networkidle", timeout: 60000 });
  await page.screenshot({ path: `da-shots/${name}.png`, fullPage: true });
  process.stdout.write(`shot: ${name}\n`);
}

await browser.close();
