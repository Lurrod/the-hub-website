import { db } from "@/lib/db";
import { Meta, Stats, Title } from "@/lib/og/fields";
import { renderOg } from "@/lib/og/frame";

export const alt = "Joueurs en recherche d'équipe";
export { contentType, size } from "@/lib/og/size";

/**
 * Les chiffres de la carte viennent de la base : sans cette option, Next fige
 * l'image au build et le compteur ne bougerait plus jusqu'au déploiement suivant.
 */
export const revalidate = 300;

export default async function Image() {
  return renderOg("LFT", async () => {
    const total = await db.player.count({ where: { lft: true } });
    return (
      <>
        <Title>Joueurs libres</Title>
        <Meta>Les joueurs qui cherchent une équipe</Meta>
        <Stats>{`${total} ${total > 1 ? "joueurs disponibles" : "joueur disponible"}`}</Stats>
      </>
    );
  });
}
