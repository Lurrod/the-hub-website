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
 * Lancer :  npx tsx scripts/prune-orphan-images.ts          (aperçu)
 *           npx tsx scripts/prune-orphan-images.ts --apply  (effacement)
 */
import path from "node:path";
import { promises as fs } from "node:fs";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const UPLOADS_ROOT = path.join(process.cwd(), "uploads");

/** `<id>.webp` et `<id>-banner.webp` désignent la même entité. */
function idFromFile(name: string): string | null {
  const m = /^(.+?)(-banner)?\.webp$/.exec(name);
  return m ? m[1] : null;
}

async function livingIds(category: string): Promise<Set<string>> {
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
  const report: Record<string, string[]> = {};

  for (const category of ["teams", "players", "tournaments"]) {
    const dir = path.join(UPLOADS_ROOT, category);
    let files: string[];
    try {
      files = await fs.readdir(dir);
    } catch (e) {
      // Une catégorie sans aucun dépôt n'a pas de dossier : ce n'est pas une
      // anomalie, on passe à la suivante.
      if ((e as NodeJS.ErrnoException)?.code === "ENOENT") continue;
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
