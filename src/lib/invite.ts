export const INVITE_TTL_DAYS = 7;

/** Format attendu d'un token : base64url de randomBytes(24) → 32 caractères [A-Za-z0-9_-]. */
export const INVITE_TOKEN_RE = /^[A-Za-z0-9_-]{32}$/;

type InviteFields = { inviteToken: string | null; inviteExpiresAt: Date | null };

/** Un token est bien formé (à vérifier avant tout accès DB). */
export function isInviteTokenFormat(token: unknown): token is string {
  return typeof token === "string" && INVITE_TOKEN_RE.test(token);
}

/**
 * Un lien est valable s'il a un token ET une expiration future.
 * Narrow le type : après `if (isInviteValid(team, now))`, `team` est non-null
 * avec `inviteToken`/`inviteExpiresAt` garantis non-null.
 */
export function isInviteValid<T extends InviteFields>(
  team: T | null,
  now: Date
): team is T & { inviteToken: string; inviteExpiresAt: Date } {
  if (!team || !team.inviteToken || !team.inviteExpiresAt) return false;
  return team.inviteExpiresAt.getTime() > now.getTime();
}
