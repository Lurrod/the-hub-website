import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/site";

/**
 * Manifeste d'application : permet l'ajout à l'écran d'accueil et donne au
 * système les couleurs de la charte. Les icônes sont celles déjà détectées
 * automatiquement par Next (src/app/icon.png et apple-icon.png).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} - T3 Valorant`,
    short_name: SITE_NAME,
    description:
      "Chaque match de chaque tournoi du Tier 3 Valorant francophone, analysé : " +
      "scoreboard complet, timeline des rounds, ACS, ADR, KAST.",
    start_url: "/",
    display: "standalone",
    lang: "fr",
    // Alignées sur --shell et --accent de globals.css.
    background_color: "#0d0f10",
    theme_color: "#ED5E29",
    icons: [
      // 192 × 192 est la taille qu'Android va chercher pour l'écran d'accueil.
      // Sans elle, le système redimensionnait le 512 à la volée : l'icône
      // fonctionnait, mais rendue moins nette. Le fichier est dérivé de
      // src/app/icon.png et vit dans public/, Next ne détectant
      // automatiquement qu'une seule taille par convention de nom.
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
