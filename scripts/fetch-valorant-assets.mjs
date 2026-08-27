#!/usr/bin/env node
/**
 * Rapatrie en local les images Valorant servies jusqu'ici par le CDN
 * `media.valorant-api.com` (icônes d'agents, de rôles, d'armes, illustrations
 * de maps), puis réécrit les tables de `src/lib/`.
 *
 * POURQUOI. Trois raisons, dans l'ordre où elles ont mordu :
 *  - le CDN est un tiers sur le chemin critique du rendu ; sa lenteur ou sa
 *    panne se voyait directement sur les cartes de partage (`src/lib/og/**`
 *    allait chercher chaque icône à chaud, temporisation à 2,5 s à la clé) ;
 *  - il fallait l'autoriser dans `img-src` de la CSP, donc ouvrir un domaine
 *    tiers sur toutes les pages ;
 *  - les originaux sont énormes (un splash de map fait 2,2 Mo en PNG) et
 *    partaient tels quels dans le navigateur.
 *
 * Les images sont donc ré-encodées en WebP à la taille réellement affichée et
 * déposées dans `public/valorant/`. Elles sont versionnées : le déploiement ne
 * fait que recopier `public/`, il ne va rien chercher.
 *
 * Usage : `npm run assets:valorant` (ajouter `--dry` pour ne rien écrire).
 *
 * La source reste valorant-api.com, qui est le catalogue d'assets de la
 * communauté. L'API HenrikDev ne peut pas la remplacer : de tous ses
 * endpoints, le seul qui renvoie une image est le générateur de viseur
 * (`/valorant/v1/crosshair/generate`) — le reste est du JSON.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_DIR = path.join(ROOT, "public", "valorant");
const API = "https://valorant-api.com/v1";
const DRY = process.argv.includes("--dry");

/** Marqueurs encadrant, dans les fichiers de `src/lib/`, la table réécrite. */
const BEGIN = "// >>> table générée par `npm run assets:valorant` — ne pas éditer à la main";
const END = "// <<< fin de la table générée";

/**
 * Une famille d'assets. `width` est la largeur de stockage : le double environ
 * de la taille d'affichage, pour rester net sur un écran à forte densité sans
 * embarquer l'original.
 */
const FAMILIES = {
  agents: { width: 256, quality: 82, square: true },
  roles: { width: 96, quality: 90, square: true },
  weapons: { width: 320, quality: 85, square: false },
  maps: { width: 768, quality: 78, square: false },
};

/** Nom d'affichage -> nom de fichier. « KAY/O » donne `kay-o`. */
function slug(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} → HTTP ${res.status}`);
  const json = await res.json();
  if (!Array.isArray(json?.data)) throw new Error(`GET ${url} → charge utile inattendue`);
  return json.data;
}

/** Deux essais : le CDN renvoie parfois un 5xx isolé sur une rafale. */
async function download(url) {
  let last;
  for (let essai = 0; essai < 3; essai++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      last = e;
      await new Promise((r) => setTimeout(r, 400 * (essai + 1)));
    }
  }
  throw new Error(`GET ${url} → ${last?.message ?? "échec"}`);
}

async function writeImage(family, name, sourceUrl) {
  const { width, quality, square } = FAMILIES[family];
  const file = `${slug(name)}.webp`;
  const dest = path.join(PUBLIC_DIR, family, file);
  const raw = await download(sourceUrl);
  const image = sharp(raw).resize(
    square
      ? { width, height: width, fit: "inside", withoutEnlargement: true }
      : { width, fit: "inside", withoutEnlargement: true }
  );
  const webp = await image.webp({ quality }).toBuffer();
  if (!DRY) {
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, webp);
  }
  return { name, url: `/valorant/${family}/${file}`, bytes: webp.length, from: raw.length };
}

/** Traite les téléchargements par lots : le CDN n'aime pas 60 requêtes d'un coup. */
async function mapLimit(items, limit, fn) {
  const out = [];
  for (let i = 0; i < items.length; i += limit) {
    out.push(...(await Promise.all(items.slice(i, i + limit).map(fn))));
  }
  return out;
}

/** Clés déjà présentes dans une table de `src/lib/` : elles font foi pour les maps. */
async function existingKeys(file, constName) {
  const source = await readFile(path.join(ROOT, "src", "lib", file), "utf8");
  const bloc = source.split(`${constName}: Record<string, string> = {`)[1]?.split("};")[0] ?? "";
  return [...bloc.matchAll(/^\s*(?:"([^"]+)"|([A-Za-z_$][\w$]*)):/gm)].map((m) => m[1] ?? m[2]);
}

function literal(entries) {
  const lignes = entries.map(([nom, url]) => {
    const cle = /^[A-Za-z_$][\w$]*$/.test(nom) ? nom : JSON.stringify(nom);
    return `  ${cle}: ${JSON.stringify(url)},`;
  });
  return lignes.join("\n");
}

/** Réécrit le bloc encadré par les marqueurs, en laissant le reste du fichier. */
async function rewriteTable(file, declaration, entries) {
  const chemin = path.join(ROOT, "src", "lib", file);
  const source = await readFile(chemin, "utf8");
  const debut = source.indexOf(BEGIN);
  const fin = source.indexOf(END);
  if (debut === -1 || fin === -1) throw new Error(`${file} : marqueurs de table introuvables`);
  const bloc = `${BEGIN}\n${declaration} {\n${literal(entries)}\n};\n${END}`;
  const suivant = source.slice(0, debut) + bloc + source.slice(fin + END.length);
  if (!DRY) await writeFile(chemin, suivant, "utf8");
}

async function main() {
  const [agents, weapons, maps] = await Promise.all([
    getJson(`${API}/agents?isPlayableCharacter=true`),
    getJson(`${API}/weapons`),
    getJson(`${API}/maps`),
  ]);

  // Rôles : ils ne vivent que dans la fiche des agents, un même rôle y étant
  // répété autant de fois qu'il a d'agents.
  const roles = [...new Map(agents.map((a) => [a.role?.uuid, a.role]).filter(([k]) => k)).values()];

  // Les maps du catalogue Riot débordent largement du jeu compétitif (stand de
  // tir, cartes de deathmatch, terrains d'essai). La table existante fait donc
  // foi : une nouvelle map se déclare à la main, et le script la signale.
  const mapsVoulues = await existingKeys("maps.ts", "MAP_SPLASH");
  const parNom = new Map(maps.filter((m) => m.splash).map((m) => [m.displayName, m]));
  const inconnues = mapsVoulues.filter((n) => !parNom.has(n));
  if (inconnues.length) throw new Error(`maps absentes du catalogue : ${inconnues.join(", ")}`);

  const travail = [
    ...agents.map((a) => ["agents", a.displayName, a.displayIcon]),
    ...roles.map((r) => ["roles", r.displayName, r.displayIcon]),
    ...weapons.filter((w) => w.displayIcon).map((w) => ["weapons", w.displayName, w.displayIcon]),
    ...mapsVoulues.map((n) => ["maps", n, parNom.get(n).splash]),
  ];

  const faits = await mapLimit(travail, 6, ([famille, nom, url]) =>
    writeImage(famille, nom, url).then((r) => ({ famille, ...r }))
  );

  // Trié par nom : les tables sont régénérées en bloc, et l'ordre de l'API
  // valorant-api.com change d'un acte à l'autre. Sans tri, chaque exécution
  // produirait un diff illisible pour zéro changement réel.
  const par = (famille) =>
    faits
      .filter((f) => f.famille === famille)
      .map((f) => [f.name, f.url])
      .sort((a, b) => a[0].localeCompare(b[0], "en"));

  await rewriteTable(
    "agents.ts",
    "export const AGENT_ICONS: Record<string, string> =",
    par("agents")
  );
  await rewriteTable("maps.ts", "export const MAP_SPLASH: Record<string, string> =", par("maps"));
  await rewriteTable(
    "weapons.ts",
    "export const WEAPON_ICONS: Record<string, string> =",
    par("weapons")
  );
  // Les rôles sont indexés par la clé interne du site (`DUELIST`…), pas par le
  // libellé Riot : la table garde donc sa forme typée, d'où la clé remontée en
  // majuscules.
  await rewriteTable(
    "roles.ts",
    "export const ROLE_ICONS: Record<ValorantRoleKey, string> =",
    par("roles").map(([nom, url]) => [nom.toUpperCase(), url])
  );

  const avant = faits.reduce((s, f) => s + f.from, 0);
  const apres = faits.reduce((s, f) => s + f.bytes, 0);
  const mo = (n) => `${(n / 1024 / 1024).toFixed(1)} Mo`;
  process.stdout.write(
    `${faits.length} images${DRY ? " (à blanc)" : ""} : ${mo(avant)} d'origine → ${mo(apres)} en WebP\n`
  );

  // Un agent sorti après la dernière mise à jour n'a pas de couleur dans
  // AGENT_COLORS : son portrait s'afficherait sur un graphique sans teinte.
  const couleurs = await readFile(path.join(ROOT, "src", "lib", "agents.ts"), "utf8");
  const sansCouleur = agents
    .map((a) => a.displayName)
    .filter(
      (n) =>
        !couleurs.includes(`AGENT_COLORS`) ||
        !new RegExp(`["\\s]${n.replace(/[/]/g, "\\/")}"?:\\s*"#`).test(
          couleurs.split("AGENT_COLORS")[1] ?? ""
        )
    );
  if (sansCouleur.length) {
    process.stdout.write(`À compléter dans AGENT_COLORS : ${sansCouleur.join(", ")}\n`);
  }
  const nouvelles = [...parNom.keys()].filter((n) => !mapsVoulues.includes(n));
  if (nouvelles.length) {
    process.stdout.write(
      `Maps du catalogue hors table (à ajouter si compétitives) : ${nouvelles.join(", ")}\n`
    );
  }
}

main().catch((e) => {
  process.stderr.write(`${e.message}\n`);
  process.exitCode = 1;
});
