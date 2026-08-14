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
        // Les deux formes de chaque chemin. Un motif robots.txt se compare par
        // préfixe : `/admin/` seul laissait `/admin` explorable, de même que
        // `/profil`, `/onboarding`, `/rejoindre` et `/api`.
        ...PRIVATE_PATHS.flatMap((p) => [p, `${p}/`]),
        // Pages de gestion, imbriquées sous les fiches publiques.
        "/equipes/*/gestion",
        "/tournois/*/gestion",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
