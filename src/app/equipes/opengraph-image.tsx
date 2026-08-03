import { db } from "@/lib/db";
import { Stats, Title } from "@/lib/og/fields";
import { renderOg } from "@/lib/og/frame";

export const alt = "Toutes les équipes du Tier 3 Valorant francophone";
export { contentType, size } from "@/lib/og/size";

/**
 * Les chiffres de la carte viennent de la base : sans cette option, Next fige
 * l'image au build et le compteur ne bougerait plus jusqu'au déploiement suivant.
 */
export const revalidate = 300;

export default async function Image() {
  return renderOg("ÉQUIPES", async () => {
    const total = await db.team.count();
    return (
      <>
        <Title>Toutes les équipes</Title>
        <Stats>{`${total} ${total > 1 ? "équipes" : "équipe"}`}</Stats>
      </>
    );
  });
}
