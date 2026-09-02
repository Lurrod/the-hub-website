import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";

export const SITE_DESCRIPTION =
  "Chaque match de chaque tournoi du Tier 3 Valorant francophone, analysé : " +
  "scoreboard complet, timeline des rounds, ACS, ADR, KAST.";

/**
 * Métadonnées d'une page publique.
 *
 * Deux raisons de passer par un helper plutôt que d'écrire l'objet à la main :
 *
 * 1. `openGraph` n'est pas fusionné profondément — une page qui le redéfinit
 *    **remplace** celui du layout racine. Sans base commune, chaque page
 *    devrait recopier siteName, type et locale.
 * 2. `alternates.canonical` ne peut pas vivre dans le layout : il serait hérité
 *    tel quel par toutes les pages, ce qui est pire que pas de canonique du
 *    tout. Il doit donc être posé page par page.
 *
 * Les chemins sont relatifs : `metadataBase` (layout racine) les rend absolus.
 */
export function pageMetadata(params: {
  /** Chemin canonique, commençant par "/". */
  path: string;
  /** Titre de la page ; le gabarit "%s · The Hub" du layout s'y applique. */
  title?: string;
  description?: string;
  /** Titre affiché sur les cartes de partage, si différent du titre de page. */
  shareTitle?: string;
}): Metadata {
  const { path, title, description, shareTitle } = params;
  const ogTitle = shareTitle ?? (title ? `${title} · ${SITE_NAME}` : `${SITE_NAME} - T3 Valorant`);
  return {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "fr_FR",
      title: ogTitle,
      description: description ?? SITE_DESCRIPTION,
      url: path,
    },
    // `twitter` n'était pas redéfini ici : le layout racine le fixe une fois
    // pour toutes, et Next ne fusionne pas ces deux blocs en profondeur. Chaque
    // fiche joueur, équipe, match ou tournoi partagée sur X affichait donc le
    // titre générique du site — alors que son image de partage, elle, est
    // générée sur mesure. Le piège est documenté juste au-dessus pour
    // `openGraph` ; il valait pour `twitter` aussi.
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: description ?? SITE_DESCRIPTION,
    },
  };
}

/**
 * Sections réservées. Posé sur un layout, l'objet est hérité par toutes les
 * pages du segment qui ne définissent pas leur propre clé `robots`.
 *
 * Ces pages redirigent déjà un visiteur non autorisé, mais rien n'empêchait
 * leurs URLs d'être collectées et publiées.
 */
export const NOINDEX: Metadata = {
  robots: { index: false, follow: false },
};
