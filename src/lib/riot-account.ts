import { parseRiotId } from "@/lib/validation/riot";
import { verifyRiotId, RiotIdError, type RiotAccount } from "@/lib/henrikdev";
import { findPlayerByPuuid, isPuuidTakenByOther } from "@/lib/data/players";

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

/**
 * Variante pour l'inscription : au lieu de refuser en bloc un puuid déjà porté,
 * distingue les deux cas.
 *
 * Une fiche **sans compte rattaché** est une fiche d'archive, créée par un admin
 * pour importer un tournoi joué hors du site : son propriétaire légitime peut la
 * revendiquer. Une fiche **déjà rattachée à un compte** reste intouchable, sinon
 * n'importe qui prendrait le contrôle d'un profil en saisissant son Riot ID.
 */
export async function resolveRiotAccountForClaim(
  input: string,
  currentPlayerId: string
): Promise<{ account: RiotAccount; claimableId: string | null }> {
  const { name, tag } = parseRiotId(input); // -> Error("RIOT_FORMAT")
  const account = await verifyRiotId(name, tag); // -> RiotIdError
  const other = await findPlayerByPuuid(account.puuid, currentPlayerId);
  if (other && other.userId !== null) throw new RiotIdError("TAKEN");
  return { account, claimableId: other?.id ?? null };
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
