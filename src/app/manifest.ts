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
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
