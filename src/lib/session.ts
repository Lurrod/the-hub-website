import { cache } from "react";
import { auth } from "@/lib/auth";
import { getPlayerByUserId } from "@/lib/data/players";

/**
 * Session de la requête en cours, dédupliquée.
 *
 * `cache` de React mémorise l'appel pour la durée d'un rendu : les deux
 * morceaux de la barre de navigation (liens et menu utilisateur) peuvent
 * l'appeler chacun sans doubler l'aller-retour en base.
 */
export const getCachedSession = cache(async () => auth());

/** Fiche joueur du visiteur, dédupliquée pour la même raison. */
export const getCachedOwnPlayer = cache(async () => {
  const session = await getCachedSession();
  if (!session?.user) return null;
  return getPlayerByUserId(session.user.id);
});
