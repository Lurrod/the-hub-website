import { parseRiotId } from "@/lib/validation/riot";
import { verifyRiotId, RiotIdError, type RiotAccount } from "@/lib/henrikdev";
import { isPuuidTakenByOther } from "@/lib/data/players";

/**
 * Parse un Riot ID saisi, le vérifie via l'API, contrôle l'unicité du puuid.
 * Lève Error("RIOT_FORMAT") ou RiotIdError (NOT_FOUND / RATE_LIMITED / API_ERROR / TAKEN).
 */
export async function resolveRiotAccount(
  input: string,
  opts?: { excludePlayerId?: string }
): Promise<RiotAccount> {
  const { name, tag } = parseRiotId(input); // -> Error("RIOT_FORMAT")
  const account = await verifyRiotId(name, tag); // -> RiotIdError
  if (await isPuuidTakenByOther(account.puuid, opts?.excludePlayerId)) {
    throw new RiotIdError("TAKEN");
  }
  return account;
}

/** Traduit une erreur de résolution en code de flash toast. */
export function riotFlashCode(error: unknown): string {
  if (error instanceof RiotIdError) {
    switch (error.code) {
      case "NOT_FOUND":
        return "riotnotfound";
      case "RATE_LIMITED":
        return "ratelimited";
      case "TAKEN":
        return "riottaken";
      default:
        return "riotapi";
    }
  }
  if (error instanceof Error && error.message === "RIOT_FORMAT") return "riotformat";
  return "riotapi";
}
