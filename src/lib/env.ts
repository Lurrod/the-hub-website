import { checkEnv } from "@/lib/env-core";
import { logger } from "@/lib/logger";

/**
 * Contrôle de l'environnement au démarrage du serveur.
 *
 * Appelé par `src/instrumentation.ts`, qui est le seul point que Next exécute
 * une fois avant de servir la première requête.
 *
 * En production on lève : mieux vaut un serveur qui refuse de démarrer, avec le
 * nom de la variable fautive, qu'un site en ligne dont la vérification des Riot
 * ID échoue en silence pendant deux semaines. pm2 relance en boucle et le
 * journal porte la raison en clair.
 *
 * En développement on se contente d'avertir : on doit pouvoir travailler sur la
 * mise en page sans clé HenrikDev.
 */
export function assertEnv(): void {
  const production = process.env.NODE_ENV === "production";
  const verdict = checkEnv(process.env, production);
  if (verdict.ok) return;

  if (production) throw new Error(verdict.message);
  logger.warn("env.incomplet", { manquantes: verdict.manquantes.join(",") });
}
