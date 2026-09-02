import type { Instrumentation } from "next";
import { buildErrorReport } from "@/lib/error-report";
import { assertEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Exécuté une fois avant la première requête. On y contrôle l'environnement :
 * c'est le seul endroit où une variable manquante peut encore être signalée
 * avant qu'elle ne devienne une panne silencieuse en production.
 *
 * `register` tourne aussi pendant `next build`, où la CI ne fournit que des
 * valeurs factices pour DATABASE_URL et AUTH_SECRET : on saute le contrôle
 * dans cette phase, sinon le build échouerait sur des variables dont il n'a
 * pas besoin.
 */
export function register(): void {
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  assertEnv();
}

/**
 * Journalisation des erreurs serveur non rattrapées.
 *
 * Next affiche à l'utilisateur un `digest` en guise de référence, mais rien ne
 * reliait ce digest à quoi que ce soit : la page d'erreur invitait à signaler
 * une référence introuvable côté serveur. Ce point d'entrée reçoit l'erreur
 * ET son digest, et les écrit dans le même flux JSON que le reste des traces
 * (PM2 → shared/logs). Un `grep <digest>` suffit désormais à retrouver la
 * pile d'origine.
 *
 * Aucune donnée personnelle : chemin, méthode et contexte de route seulement,
 * conformément à la règle posée dans `lib/logger.ts`. Les en-têtes de la
 * requête ne sont pas journalisés — ils portent les cookies de session.
 */
export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  logger.error("request.error", buildErrorReport(error, request, context));
};
