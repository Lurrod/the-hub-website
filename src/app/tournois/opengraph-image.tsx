import { db } from "@/lib/db";
import { Stats, Title } from "@/lib/og/fields";
import { renderOg } from "@/lib/og/frame";
import { metaLine } from "@/lib/og/labels";
import { finishedCutoff } from "@/lib/tournament-status";

export const alt = "Tous les tournois du Tier 3 Valorant francophone";
export { contentType, size } from "@/lib/og/size";

/**
 * Les chiffres de la carte viennent de la base : sans cette option, Next fige
 * l'image au build et le compteur ne bougerait plus jusqu'au déploiement suivant.
 */
export const revalidate = 300;

export default async function Image() {
  return renderOg("TOURNOIS", async () => {
    const [total, ongoing] = await Promise.all([
      db.tournament.count(),
      // Même règle que `syncFinishedTournaments`, sans l'écriture : une carte
      // de partage ne doit pas modifier la base pour afficher un chiffre.
      db.tournament.count({
        where: {
          status: "ONGOING",
          OR: [{ endDate: null }, { endDate: { gte: finishedCutoff() } }],
        },
      }),
    ]);
    return (
      <>
        <Title>Tous les tournois</Title>
        <Stats>
          {metaLine([
            `${total} ${total > 1 ? "tournois" : "tournoi"}`,
            ongoing > 0 ? `${ongoing} en cours` : null,
          ])}
        </Stats>
      </>
    );
  });
}
