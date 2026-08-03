import { db } from "@/lib/db";
import { Meta, Stats, Title } from "@/lib/og/fields";
import { renderOg } from "@/lib/og/frame";

export const alt = "Joueurs en recherche d'équipe";
export { contentType, size } from "@/lib/og/size";

/**
 * Rendu à la demande, jamais au build : la CI construit avec un `DATABASE_URL`
 * factice, donc un prérendu produirait le cadre nu — sans titre ni compteur —
 * et le figerait dans l'artefact déployé. La mise en cache est portée par
 * l'en-tête `Cache-Control` posé par `renderOg`.
 */
export const dynamic = "force-dynamic";

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
