import { db } from "@/lib/db";
import { Stats, Title } from "@/lib/og/fields";
import { renderOg } from "@/lib/og/frame";

export const alt = "Tous les matchs du Tier 3 Valorant francophone";
export { contentType, size } from "@/lib/og/size";

/**
 * Les chiffres de la carte viennent de la base : sans cette option, Next fige
 * l'image au build et le compteur ne bougerait plus jusqu'au déploiement suivant.
 */
export const revalidate = 300;

export default async function Image() {
  return renderOg("MATCHS", async () => {
    const played = await db.match.count({ where: { status: "FINISHED" } });
    return (
      <>
        <Title>Tous les matchs</Title>
        <Stats>{`${played} ${played > 1 ? "matchs joués" : "match joué"}`}</Stats>
      </>
    );
  });
}
