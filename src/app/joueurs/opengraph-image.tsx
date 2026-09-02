import { countPlayers } from "@/lib/data/counts";
import { Stats, Title } from "@/lib/og/fields";
import { renderOg } from "@/lib/og/frame";

export const alt = "Tous les joueurs du Tier 3 Valorant francophone";
export { contentType, size } from "@/lib/og/size";

/**
 * Rendu à la demande, jamais au build : la CI construit avec un `DATABASE_URL`
 * factice, donc un prérendu produirait le cadre nu — sans titre ni compteur —
 * et le figerait dans l'artefact déployé. La mise en cache est portée par
 * l'en-tête `Cache-Control` posé par `renderOg`.
 */
export const dynamic = "force-dynamic";

export default async function Image() {
  return renderOg("JOUEURS", async () => {
    const total = await countPlayers();
    return (
      <>
        <Title>Tous les joueurs</Title>
        <Stats>{`${total} ${total > 1 ? "joueurs" : "joueur"}`}</Stats>
      </>
    );
  });
}
