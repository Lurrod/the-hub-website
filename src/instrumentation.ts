import type { Instrumentation } from "next";
import { buildErrorReport } from "@/lib/error-report";
import { logger } from "@/lib/logger";

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
