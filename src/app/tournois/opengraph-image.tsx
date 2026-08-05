import { db } from "@/lib/db";
import { Stats, Title } from "@/lib/og/fields";
import { renderOg } from "@/lib/og/frame";
import { metaLine } from "@/lib/og/labels";
import { finishedCutoff } from "@/lib/tournament-status";

export const alt = "Tous les tournois du Tier 3 Valorant francophone";
export { contentType, size } from "@/lib/og/size";

/**
 * Rendu à la demande, jamais au build : la CI construit avec un `DATABASE_URL`
 * factice, donc un prérendu produirait le cadre nu — sans titre ni compteur —
 * et le figerait dans l'artefact déployé. La mise en cache est portée par
 * l'en-tête `Cache-Control` posé par `renderOg`.
 */
export const dynamic = "force-dynamic";

export default async function Image() {
  return renderOg("TOURNOIS", async () => {
    const [total, ongoing] = await Promise.all([
      db.tournament.count(),
      // Même règle que `syncTournamentStatuses`, sans l'écriture : une carte
      // de partage ne doit pas modifier la base pour afficher un chiffre. D'où
      // le rattrapage des tournois commencés dont le statut n'a pas encore été
      // recalé, au même titre que ceux déjà marqués « en cours ».
      db.tournament.count({
        where: {
          OR: [{ endDate: null }, { endDate: { gte: finishedCutoff() } }],
          AND: [
            {
              OR: [
                { status: "ONGOING" },
                { status: "UPCOMING", startDate: { lte: finishedCutoff() } },
              ],
            },
          ],
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
