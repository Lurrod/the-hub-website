import { Stats, Title } from "@/lib/og/fields";
import { renderOg } from "@/lib/og/frame";
import { metaLine } from "@/lib/og/labels";
import { countTournaments } from "@/lib/data/counts";

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
    const [total, ongoing] = await countTournaments();
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
