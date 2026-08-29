import { z } from "zod";

/**
 * Paire soumise depuis la page de rapprochement des doublons.
 *
 * Les deux identifiants viennent d'un formulaire, donc du client : ils sont
 * validés comme tout ce qui franchit une frontière. Le refus du couple
 * identique n'est pas théorique — un lien mal construit écarterait une fiche
 * d'elle-même et créerait une ligne que rien ne viendrait jamais nettoyer.
 */
export const pairePotentielleSchema = z
  .object({
    miroirId: z.string().min(1).max(64),
    manuelleId: z.string().min(1).max(64),
  })
  .refine((p) => p.miroirId !== p.manuelleId, {
    message: "Une fiche ne peut pas être écartée d'elle-même.",
  });

export type PairePotentielle = z.infer<typeof pairePotentielleSchema>;
