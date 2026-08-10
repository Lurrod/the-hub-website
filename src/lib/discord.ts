/**
 * Discord affiché sur une fiche joueur.
 *
 * Le compte se rejoint par son identifiant numérique, pas par son pseudo :
 * `discord.com/users/<id>` ouvre la fiche dans l'application (ou sur le web)
 * même si la personne a changé de pseudo depuis sa dernière connexion. Le
 * pseudo ne sert donc qu'à l'infobulle, pour qu'on sache qui on ajoute.
 */

export type PlayerDiscordSource = {
  showDiscord: boolean;
  user: { discordId: string | null; discordUsername: string | null } | null;
};

export type PlayerDiscord = { url: string; label: string };

/** Lien vers le profil Discord d'un compte. */
export function discordProfileUrl(discordId: string): string {
  return `https://discord.com/users/${encodeURIComponent(discordId)}`;
}

/**
 * Entrée « discord » à fusionner dans les réseaux d'une fiche, ou `null` quand
 * il n'y a rien à montrer : fiche sans compte lié (joueur créé à la main par un
 * organisateur) ou joueur qui a masqué son Discord depuis ses paramètres.
 */
export function playerDiscordSocial(player: PlayerDiscordSource): PlayerDiscord | null {
  if (!player.showDiscord) return null;
  const discordId = player.user?.discordId;
  if (!discordId) return null;
  const username = player.user?.discordUsername;
  return {
    url: discordProfileUrl(discordId),
    label: username ? `Discord · ${username}` : "Discord",
  };
}
