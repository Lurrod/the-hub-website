/**
 * Journalisation structurée, sans dépendance.
 *
 * Les traces partent sur la sortie standard du process, que PM2 redirige vers
 * shared/logs/{out,error}.log (voir ecosystem.config.cjs). Une ligne = un objet
 * JSON : le niveau, l'horodatage et le contexte sont exploitables tels quels,
 * là où un `console.error` laissait un texte libre noyé dans les traces du
 * runtime.
 *
 * Règle : ne jamais passer de donnée personnelle en contexte. Des
 * identifiants techniques (id de match, d'utilisateur) suffisent au
 * diagnostic ; un pseudo, un e-mail ou un Riot ID n'ont rien à faire dans un
 * fichier de log.
 */
export type LogLevel = "info" | "warn" | "error";

export type LogContext = Record<string, string | number | boolean | null | undefined>;

/** Réduit une valeur inconnue attrapée dans un catch à un contexte sérialisable. */
export function describeError(error: unknown): LogContext {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
      // `code` est porté par RiotIdError et par les erreurs Prisma.
      errorCode: (error as { code?: string }).code,
    };
  }
  return { errorName: typeof error, errorMessage: String(error) };
}

/** Construit la ligne JSON émise. Exporté pour être testable sans capturer la console. */
export function formatLogLine(
  level: LogLevel,
  event: string,
  context: LogContext | undefined,
  now: Date
): string {
  const payload: Record<string, unknown> = {
    level,
    time: now.toISOString(),
    event,
  };
  for (const [key, value] of Object.entries(context ?? {})) {
    if (value !== undefined) payload[key] = value;
  }
  return JSON.stringify(payload);
}

function emit(level: LogLevel, event: string, context?: LogContext): void {
  const line = formatLogLine(level, event, context, new Date());
  // Point de sortie unique et assumé : la configuration ESLint lève
  // `no-console` pour ce seul fichier.
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (event: string, context?: LogContext) => emit("info", event, context),
  warn: (event: string, context?: LogContext) => emit("warn", event, context),
  error: (event: string, context?: LogContext) => emit("error", event, context),
};
