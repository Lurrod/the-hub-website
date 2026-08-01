/**
 * URL publique du site, source unique pour les métadonnées, le sitemap et le
 * robots.txt. `NEXT_PUBLIC_BASE_URL` permet de la surcharger en préproduction ;
 * le repli vaut le domaine de production.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://the-hub-vrc.fr";

/** Nom affiché dans les métadonnées et les données structurées. */
export const SITE_NAME = "The Hub";

/**
 * Sections réservées : jamais indexées, jamais listées dans le sitemap.
 * Les pages de gestion vivent sous /equipes/<id>/gestion et
 * /tournois/<id>/gestion, d'où le motif suffixé traité à part.
 */
export const PRIVATE_PATHS = [
  "/admin",
  "/profil",
  "/onboarding",
  "/rejoindre",
  "/api",
] as const;
