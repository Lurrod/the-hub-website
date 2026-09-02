import { beforeAll, beforeEach, afterAll } from "vitest";
import { db } from "@/lib/db";

/**
 * Harnais des tests d'intégration.
 *
 * Deux garde-fous avant toute écriture, parce que ce fichier VIDE des tables :
 * la base doit être nommée explicitement pour l'intégration, et elle ne doit
 * pas être celle de développement. Se tromper de `DATABASE_URL` coûterait le
 * jeu de données de travail — le genre d'erreur qu'on ne fait qu'une fois,
 * mais une fois de trop.
 */

const url = process.env.DATABASE_URL ?? "";
const nomBase = url.split("/").pop()?.split("?")[0] ?? "";

/**
 * Tables à vider, lues dans le catalogue plutôt qu'écrites à la main.
 *
 * Une liste tenue à la main se périme au premier modèle ajouté, et elle m'a
 * déjà pris en défaut : j'y avais inscrit une table inexistante. `TRUNCATE`
 * groupé avec `CASCADE` règle en prime l'ordre des clés étrangères, qu'une
 * liste manuelle doit sinon respecter dans le bon sens.
 *
 * `_prisma_migrations` est préservée : la vider forcerait un rejeu complet des
 * migrations à chaque exécution.
 */
let tables: string[] = [];

beforeAll(async () => {
  if (!url) {
    throw new Error("DATABASE_URL absente : les tests d'intégration exigent une vraie base.");
  }
  if (!/integration|test/i.test(nomBase)) {
    throw new Error(
      `Base « ${nomBase} » refusée : le nom doit contenir « integration » ou « test ». ` +
        `Ces tests effacent les tables entre chaque cas — voir vitest.integration.config.ts.`
    );
  }

  const rows = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  tables = rows.map((r) => `"${r.tablename}"`);
  if (tables.length === 0) {
    throw new Error(
      "Aucune table dans la base d'intégration : lancer `prisma migrate deploy` dessus d'abord."
    );
  }
});

beforeEach(async () => {
  await db.$executeRawUnsafe(`TRUNCATE TABLE ${tables.join(", ")} RESTART IDENTITY CASCADE`);
});

afterAll(async () => {
  await db.$disconnect();
});
