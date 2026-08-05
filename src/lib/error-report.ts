import { describeError, type LogContext } from "@/lib/logger";

/** Sous-ensemble des informations de requête que l'on accepte de journaliser. */
export type ErrorRequestInfo = { path?: string; method?: string };
/** Sous-ensemble du contexte de route fourni par Next. */
export type ErrorRouteContext = { routePath?: string; routeType?: string };

/**
 * Contexte de journalisation d'une erreur serveur.
 *
 * Le `digest` est la clé : c'est la seule référence dont dispose l'utilisateur
 * quand la page d'erreur s'affiche. Sans lui dans les traces, le signalement
 * « Référence : 1234567890 » ne mène nulle part.
 *
 * Volontairement sans en-têtes ni corps de requête : ils portent les cookies
 * de session et les valeurs saisies. Le chemin et le type de route suffisent à
 * localiser le problème.
 */
export function buildErrorReport(
  error: unknown,
  request: ErrorRequestInfo,
  context: ErrorRouteContext
): LogContext {
  return {
    digest:
      typeof error === "object" && error !== null && "digest" in error
        ? String((error as { digest?: unknown }).digest)
        : undefined,
    path: request.path,
    method: request.method,
    routePath: context.routePath,
    routeType: context.routeType,
    ...describeError(error),
  };
}
