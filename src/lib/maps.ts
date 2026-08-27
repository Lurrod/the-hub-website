// Table nom de map -> chemin de l'image « splash » servie par le site.
// Rapatriée de valorant-api.com par `npm run assets:valorant`, qui ré-encode le
// PNG d'origine (2,2 Mo par map) en WebP à la largeur d'affichage. Les clés font
// foi : le catalogue Riot contient aussi le stand de tir et les maps de
// deathmatch, qu'on ne veut pas ici.
// >>> table générée par `npm run assets:valorant` — ne pas éditer à la main
export const MAP_SPLASH: Record<string, string> = {
  Abyss: "/valorant/maps/abyss.webp",
  Ascent: "/valorant/maps/ascent.webp",
  Bind: "/valorant/maps/bind.webp",
  Breeze: "/valorant/maps/breeze.webp",
  Corrode: "/valorant/maps/corrode.webp",
  Fracture: "/valorant/maps/fracture.webp",
  Haven: "/valorant/maps/haven.webp",
  Icebox: "/valorant/maps/icebox.webp",
  Lotus: "/valorant/maps/lotus.webp",
  Pearl: "/valorant/maps/pearl.webp",
  Split: "/valorant/maps/split.webp",
  Sunset: "/valorant/maps/sunset.webp",
};
// <<< fin de la table générée

/** URL de l'image d'une map, ou undefined si inconnue. */
export function mapSplashUrl(map: string | null | undefined): string | undefined {
  if (!map) return undefined;
  return MAP_SPLASH[map];
}
