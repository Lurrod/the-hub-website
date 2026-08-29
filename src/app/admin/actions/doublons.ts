"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/server-auth";
import { pairePotentielleSchema } from "@/lib/validation/doublons";
import { ecarterPaire, retablirPaire } from "@/lib/data/doublons-equipes";

function lirePaire(formData: FormData) {
  return pairePotentielleSchema.parse({
    miroirId: formData.get("miroirId"),
    manuelleId: formData.get("manuelleId"),
  });
}

/**
 * Écarte définitivement une paire du rapprochement.
 *
 * Réservé aux administrateurs : la décision vaut pour tous les passages
 * suivants, y compris après une resynchronisation Premier.
 */
export async function ecarterPaireAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const { miroirId, manuelleId } = lirePaire(formData);
  await ecarterPaire(miroirId, manuelleId);
  revalidatePath("/admin/doublons");
}

/** Remet une paire écartée dans la liste des candidats. */
export async function retablirPaireAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const { miroirId, manuelleId } = lirePaire(formData);
  await retablirPaire(miroirId, manuelleId);
  revalidatePath("/admin/doublons");
}
