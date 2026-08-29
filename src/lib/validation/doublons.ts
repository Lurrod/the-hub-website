import { z } from "zod";

/**
 * Clé de paire soumise depuis la page de rapprochement des doublons.
 *
 * Forme `<idMiroir>:<idManuelle>`. Les identifiants viennent d'un formulaire,
 * donc du client : ils sont validés comme tout ce qui franchit une frontière.
 * Le jeu de caractères est celui d'un cuid, élargi au tiret et au souligné —
 * les jeux de données de test posent des identifiants lisibles du genre
 * `fx-doublon-miroir`.
 *
 * Le refus du couple identique n'est pas théorique : une clé bricolée
 * fusionnerait une fiche avec elle-même, c'est-à-dire lui déplacerait ses
 * propres matchs avant de la supprimer.
 */
export const clePaireSchema = z
  .string()
  .max(129)
  .regex(/^[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$/, "Clé de paire malformée.")
  .refine((c) => {
    const [a, b] = c.split(":");
    return a !== b;
  }, "Une fiche ne peut pas être rapprochée d'elle-même.");

/** Lot de clés cochées. Le plafond borne l'URL du récapitulatif. */
export const lotPairesSchema = z.array(clePaireSchema).max(100);
