export const INVITE_TTL_DAYS = 7;

type InviteFields = { inviteToken: string | null; inviteExpiresAt: Date | null };

/** Un lien est valable s'il a un token ET une expiration future. */
export function isInviteValid(team: InviteFields | null, now: Date): boolean {
  if (!team || !team.inviteToken || !team.inviteExpiresAt) return false;
  return team.inviteExpiresAt.getTime() > now.getTime();
}
