import type { MetadataRoute } from "next";
import { PRIVATE_PATHS, SITE_URL } from "@/lib/site";

/**
 * Les sections réservées redirigent déjà vers l'accueil pour un visiteur non
 * autorisé, mais rien n'empêchait jusqu'ici un robot de les parcourir et d'en
 * publier les URLs — les liens d'invitation compris.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        ...PRIVATE_PATHS.map((p) => `${p}/`),
        // Pages de gestion, imbriquées sous les fiches publiques.
        "/equipes/*/gestion",
        "/tournois/*/gestion",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
