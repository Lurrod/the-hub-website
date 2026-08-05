import { ZodError } from "zod";

/**
 * Déduit un code de flash (`?error=`) à partir d'une erreur de validation.
 * Permet aux actions serveur de rediriger vers une modale d'erreur claire
 * plutôt que de laisser la ZodError remonter en erreur runtime.
 */
export function flashCodeFromError(error: unknown): string {
  if (error instanceof ZodError) {
    for (const issue of error.issues) {
      const field = issue.path[issue.path.length - 1];
      if (field === "twitter") return "twitter";
      if (field === "twitch") return "twitch";
      if (field === "scoreA" || field === "scoreB") return "score";
    }
  }
  return "invalid";
}
