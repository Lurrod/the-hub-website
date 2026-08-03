/**
 * Jetons de style des images de partage.
 *
 * Satori ne lit pas `src/app/globals.css` : les valeurs y sont recopiées à la
 * main. Toute modification des variables CSS du site doit être répercutée ici.
 */
export const OG = {
  bg: "#131619",
  card: "#191c22",
  category: "#1f232b",
  border: "#303133",
  accent: "#ED5E29",
  glow: "rgba(237, 94, 41, 0.30)",
  text: "#fafafa",
  muted: "#9b9c9e",
  subtle: "#6f7178",
} as const;

/** Les deux familles déclarées dans `fonts.ts`. */
export const DISPLAY = "Bricolage";
export const MONO = "GeistMono";
