/**
 * Rattrapage des images orphelines laissées sur le disque.
 *
 * Jusqu'à la correction de RGPD-01, supprimer une équipe, un tournoi ou un
 * joueur ne retirait que la ligne en base : le fichier `uploads/<cat>/<id>.webp`
 * restait servi par `/api/images`, dont la clé est déterministe donc devinable.
 * Les suppressions appellent désormais `deleteStoredImage`, mais les fichiers
 * déjà orphelins ne partiront pas tout seuls — d'où ce script, à passer une
 * fois après la mise en production.
 *
 * Le critère d'orphelin est l'absence de l'identifiant en base, pas l'absence
 * de référence dans la colonne `logo` / `photo` : un fichier peut exister sans
 * que la colonne soit renseignée, et l'entité reste alors légitime.
 *
 * ## Pourquoi du JavaScript et pas du TypeScript
 *
 * Ce script doit tourner sur le serveur, où seul le paquet `standalone` est
 * déployé : il n'y a ni `tsx`, ni les dépendances de développement, ni le
 * `package.json` du dépôt. Écrit en `.mjs`, il s'exécute avec le Node et le
 * client Prisma déjà présents dans la release. Les scripts d'amorçage
 * (`seed-*`), eux, restent en TypeScript : ils n'ont rien à faire en
 * production.
 *
 * ## Lancer
 *
 * En local :
 *   npm run images:prune            (aperçu)
 *   npm run images:prune -- --apply (effacement)
 *
 * Sur le serveur :
 *   APP=/var/www/the-hub-vrc.fr
 *   cd "$APP/current" && set -a && . "$APP/shared/.env" && set +a
 *   node scripts/prune-orphan-images.mjs
 *   node scripts/prune-orphan-images.mjs --apply
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promises as fs } from "node:fs";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// Résolu depuis l'emplacement du script et non depuis `process.cwd()` : sur le
// serveur, `uploads` est un lien vers le volume persistant, et le script doit
// viser le bon dossier quel que soit le répertoire courant.
const UPLOADS_ROOT = fileURLToPath(new URL("../uploads", import.meta.url));

const CATEGORIES = ["teams", "players", "tournaments"];

/**
 * `<id>.webp` et `<id>-banner.webp` désignent la même entité.
 * @param {string} name
 * @returns {string | null}
 */
function idFromFile(name) {
  const m = /^(.+?)(-banner)?\.webp$/.exec(name);
  return m ? m[1] : null;
}

/**
 * @param {string} category
 * @returns {Promise<Set<string>>}
 */
async function livingIds(category) {
  const rows =
    category === "teams"
      ? await db.team.findMany({ select: { id: true } })
      : category === "players"
        ? await db.player.findMany({ select: { id: true } })
        : await db.tournament.findMany({ select: { id: true } });
  return new Set(rows.map((r) => r.id));
}

async function main() {
  const apply = process.argv.includes("--apply");
  /** @type {Record<string, string[]>} */
  const report = {};

  for (const category of CATEGORIES) {
    const dir = path.join(UPLOADS_ROOT, category);
    /** @type {string[]} */
    let files;
    try {
      files = await fs.readdir(dir);
    } catch (e) {
      // Une catégorie sans aucun dépôt n'a pas de dossier : ce n'est pas une
      // anomalie, on passe à la suivante.
      if (e?.code === "ENOENT") continue;
      throw e;
    }
    const alive = await livingIds(category);
    const orphans = files.filter((f) => {
      const id = idFromFile(f);
      return id !== null && !alive.has(id);
    });
    report[category] = orphans;
    if (apply) {
      for (const f of orphans) await fs.unlink(path.join(dir, f));
    }
  }

  console.log(
    JSON.stringify({
      event: "images.prune",
      time: new Date().toISOString(),
      root: UPLOADS_ROOT,
      mode: apply ? "apply" : "dry-run",
      orphans: report,
      total: Object.values(report).reduce((n, list) => n + list.length, 0),
    })
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
