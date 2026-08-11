/**
 * Métadonnées communes aux routes `opengraph-image.tsx`. Next lit ces exports
 * pour produire les balises `og:image:width`, `og:image:height` et
 * `og:image:type` ; chaque route les réexporte.
 */
export const size = { width: 1200, height: 630 };

export const contentType = "image/png";

/**
 * Format des cartes téléchargeables depuis une fiche.
 *
 * Le carré est ce qu'attendent Discord, une story et un post X ; le 1200×630
 * ci-dessus est un bandeau, que ces surfaces recadrent ou rétrécissent dès
 * qu'il n'est pas lu comme un aperçu de lien.
 */
export const shareSize = { width: 1080, height: 1080 };
