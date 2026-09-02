import { z } from "zod";

/**
 * Contrôle des variables d'environnement, sans toucher à `process.env`.
 *
 * Le projet valide par Zod à toutes ses frontières sauf celle-ci : six
 * variables étaient lues à la volée, sans schéma ni vérification de présence.
 * Une valeur absente ou expirée ne se voyait donc qu'à l'usage, en production.
 * C'est exactement l'incident du 2026-08-31 : `HENRIKDEV_API_KEY` renvoyait 401
 * et toutes les vérifications de Riot ID échouaient côté visiteur, sans
 * qu'aucune alerte ne parte. `PREMIER_SYNC_SECRET` absent fait échouer la
 * crontab en 401 tout aussi discrètement.
 *
 * Fonction pure, testable sans environnement : l'état entre, le verdict sort.
 */

/** Variables sans lesquelles l'application ne peut pas démarrer, où que ce soit. */
const toujoursRequises = {
  DATABASE_URL: z.string().min(1, "chaîne de connexion PostgreSQL"),
  AUTH_SECRET: z.string().min(1, "secret de session Auth.js (npx auth secret)"),
  AUTH_DISCORD_ID: z.string().min(1, "identifiant de l'application Discord"),
  AUTH_DISCORD_SECRET: z.string().min(1, "secret de l'application Discord"),
};

/**
 * Variables requises en production seulement.
 *
 * En développement, leur absence dégrade une fonctionnalité sans empêcher de
 * travailler : sans clé HenrikDev on ne vérifie pas les Riot ID, sans secret de
 * synchronisation on n'importe pas le Premier. En production, les deux sont des
 * pannes silencieuses — donc des refus de démarrage.
 */
const requisesEnProduction = {
  HENRIKDEV_API_KEY: z.string().min(1, "clé API HenrikDev (vérification des Riot ID)"),
  PREMIER_SYNC_SECRET: z.string().min(1, "secret de POST /api/premier/sync (openssl rand -hex 32)"),
  // `z.url()` s'appuie sur `new URL()`, qui accepte « localhost:3200 » :
  // protocole « localhost: », chemin « 3200 ». On exige donc http(s)
  // explicitement — cette valeur sert à bâtir les liens d'invitation et
  // les URL canoniques, une forme relative y passerait inaperçue.
  NEXT_PUBLIC_BASE_URL: z
    .string()
    .regex(/^https?:\/\/[^\s]+$/, "URL publique absolue du site (http:// ou https://)"),
};

export type EnvVerdict = { ok: true } | { ok: false; manquantes: string[]; message: string };

/**
 * @param env         l'environnement à contrôler
 * @param production  applique en plus les exigences de production
 */
export function checkEnv(env: Record<string, string | undefined>, production: boolean): EnvVerdict {
  const forme = production ? { ...toujoursRequises, ...requisesEnProduction } : toujoursRequises;
  // Une chaîne vide vaut une variable absente : `HENRIKDEV_API_KEY=` dans un
  // fichier .env est le cas qui a produit l'incident, et il passe tous les
  // contrôles de présence naïfs.
  const nettoye = Object.fromEntries(
    Object.entries(env).map(([k, v]) => [k, v?.trim() ? v : undefined])
  );
  const resultat = z.object(forme).safeParse(nettoye);
  if (resultat.success) return { ok: true };

  const manquantes = resultat.error.issues.map((i) => String(i.path[0]));
  const details = resultat.error.issues
    .map((i) => `  - ${String(i.path[0])} : ${i.message}`)
    .join("\n");
  return {
    ok: false,
    manquantes,
    message:
      `Variables d'environnement manquantes ou invalides ` +
      `(${production ? "production" : "développement"}) :\n${details}\n` +
      `Voir .env.example pour le format attendu.`,
  };
}
