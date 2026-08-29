"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/server-auth";
import { logger, describeError } from "@/lib/logger";
import { clePaireSchema, lotPairesSchema } from "@/lib/validation/doublons";
import { relirePaire } from "@/lib/doublons-equipes-core";
import {
  ecarterPaire,
  retablirPaire,
  fusionnerPaire,
  FusionRefusee,
} from "@/lib/data/doublons-equipes";

/**
 * Les actions par ligne reçoivent leur clé `<idMiroir>:<idManuelle>` par
 * `bind`, et non par le `FormData`.
 *
 * Deux raisons, toutes deux payées ici. D'abord les formulaires HTML ne
 * s'imbriquent pas : la liste porte des cases à cocher pour la fusion par lot
 * et un bouton d'écartement par ligne, tout cela dans un seul formulaire, donc
 * un champ caché par ligne serait envoyé pour *toutes* les lignes à la fois.
 * Ensuite, et c'est ce qui a cassé la première version, **React n'inclut pas le
 * `name`/`value` du bouton déclencheur dans le `FormData` d'une action
 * serveur** — `formData.get("ecarter")` valait null et l'action levait une
 * ZodError. Une valeur liée ne dépend pas du formulaire.
 */
function lireCle(cle: unknown) {
  const paire = relirePaire(clePaireSchema.parse(cle));
  // `relirePaire` ne peut pas rendre null après le schéma, mais le typage ne le
  // sait pas et un `!` ici masquerait une divergence future entre les deux.
  if (!paire) throw new Error("Clé de paire invalide.");
  return paire;
}

/**
 * Écarte définitivement une paire du rapprochement.
 *
 * Réservé aux administrateurs : la décision vaut pour tous les passages
 * suivants, y compris après une resynchronisation Premier.
 */
export async function ecarterPaireAction(cle: string): Promise<void> {
  await requireAdmin();
  const { miroirId, manuelleId } = lireCle(cle);
  await ecarterPaire(miroirId, manuelleId);
  revalidatePath("/admin/doublons");
}

/** Remet une paire écartée dans la liste des candidats. */
export async function retablirPaireAction(cle: string): Promise<void> {
  await requireAdmin();
  const { miroirId, manuelleId } = lireCle(cle);
  await retablirPaire(miroirId, manuelleId);
  revalidatePath("/admin/doublons");
}

/**
 * Envoie les paires cochées vers le récapitulatif.
 *
 * Rien n'est écrit ici : c'est l'étape qui donne à voir ce qu'une fusion par lot
 * s'apprête à déplacer et à supprimer, avant qu'un second clic l'engage.
 */
export async function preparerFusionAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const cles = lotPairesSchema.parse(formData.getAll("paire").map(String));
  if (cles.length === 0) redirect("/admin/doublons?rien=1");

  const sp = new URLSearchParams();
  for (const c of cles) sp.append("paire", c);
  redirect(`/admin/doublons/fusion?${sp.toString()}`);
}

/** Nombre de refus détaillés dans le bandeau de retour. Au-delà, on compte. */
const REFUS_DETAILLES = 3;

/**
 * Fusionne le lot de paires confirmées.
 *
 * Chaque paire a sa propre transaction : un refus sur l'une ne doit pas annuler
 * les fusions déjà faites, qui sont justes. Le prix est qu'un lot peut finir à
 * moitié appliqué — d'où le rapport nominatif au retour, et le fait que les
 * paires refusées restent dans la liste, où on les retrouve telles quelles.
 */
export async function fusionnerAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const cles = lotPairesSchema.parse(formData.getAll("paire").map(String));

  let fusionnees = 0;
  const refus: string[] = [];

  for (const cle of cles) {
    const paire = relirePaire(cle);
    if (!paire) continue;
    try {
      const rapport = await fusionnerPaire(paire.miroirId, paire.manuelleId);
      fusionnees++;
      logger.info("doublons.fusion", {
        miroirId: paire.miroirId,
        manuelleId: paire.manuelleId,
        matchs: rapport.matchs,
        inscriptions: rapport.inscriptionsDeplacees,
        membres: rapport.membresDeplaces,
      });
    } catch (error) {
      // Un refus est une décision du domaine, pas une panne : il se raconte à
      // l'utilisateur. Toute autre erreur est journalisée sans être exposée.
      if (error instanceof FusionRefusee) {
        refus.push(error.raison);
      } else {
        logger.error("doublons.fusion.echec", { ...paire, ...describeError(error) });
        refus.push("Une fusion a échoué pour une raison technique.");
      }
    }
  }

  const sp = new URLSearchParams({ fusionnees: String(fusionnees) });
  // Les raisons voyagent par l'URL : au-delà de trois elle deviendrait
  // ingérable, et le compte suffit à dire qu'il reste à regarder.
  for (const r of refus.slice(0, REFUS_DETAILLES)) sp.append("refus", r);
  if (refus.length > REFUS_DETAILLES) {
    sp.set("refusRestants", String(refus.length - REFUS_DETAILLES));
  }

  revalidatePath("/admin/doublons");
  redirect(`/admin/doublons?${sp.toString()}`);
}
