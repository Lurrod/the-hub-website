// Table nom d'arme -> chemin d'icône servi par le site (pas de fetch runtime).
// Rapatriée de valorant-api.com par `npm run assets:valorant`, comme AGENT_ICONS.
// >>> table générée par `npm run assets:valorant` — ne pas éditer à la main
export const WEAPON_ICONS: Record<string, string> = {
  Ares: "/valorant/weapons/ares.webp",
  Bandit: "/valorant/weapons/bandit.webp",
  Bucky: "/valorant/weapons/bucky.webp",
  Bulldog: "/valorant/weapons/bulldog.webp",
  Classic: "/valorant/weapons/classic.webp",
  Frenzy: "/valorant/weapons/frenzy.webp",
  Ghost: "/valorant/weapons/ghost.webp",
  Guardian: "/valorant/weapons/guardian.webp",
  Judge: "/valorant/weapons/judge.webp",
  Marshal: "/valorant/weapons/marshal.webp",
  Melee: "/valorant/weapons/melee.webp",
  Odin: "/valorant/weapons/odin.webp",
  Operator: "/valorant/weapons/operator.webp",
  Outlaw: "/valorant/weapons/outlaw.webp",
  Phantom: "/valorant/weapons/phantom.webp",
  Sheriff: "/valorant/weapons/sheriff.webp",
  Shorty: "/valorant/weapons/shorty.webp",
  Spectre: "/valorant/weapons/spectre.webp",
  Stinger: "/valorant/weapons/stinger.webp",
  Vandal: "/valorant/weapons/vandal.webp",
};
// <<< fin de la table générée

/** URL d'icône d'une arme, null si le nom est inconnu (arme future, capacité). */
export function weaponIconUrl(weapon: string | null | undefined): string | null {
  return weapon ? (WEAPON_ICONS[weapon] ?? null) : null;
}

/**
 * Nom affiché. Les armes gardent leur nom du jeu — c'est sous ces noms que la
 * scène en parle — sauf « Melee », jargon d'API que personne n'emploie.
 */
export function weaponLabel(weapon: string): string {
  return weapon === "Melee" ? "Couteau" : weapon;
}
