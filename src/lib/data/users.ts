import { db } from "@/lib/db";

/**
 * Comptes du site.
 *
 * Un seul besoin pour l'instant : retrouver un compte par son identifiant
 * Discord, quand un manager est ajouté à une équipe ou à un tournoi — c'est
 * l'identifiant que l'on se transmet, le nôtre n'étant pas public.
 */

/** Identifiant interne du compte portant cet identifiant Discord, s'il existe. */
export async function findUserIdByDiscordId(discordId: string): Promise<string | null> {
  const user = await db.user.findUnique({ where: { discordId }, select: { id: true } });
  return user?.id ?? null;
}
