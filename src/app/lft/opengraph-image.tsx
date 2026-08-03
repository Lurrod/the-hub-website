import { db } from "@/lib/db";
import { Meta, Stats, Title } from "@/lib/og/fields";
import { renderOg } from "@/lib/og/frame";

export const alt = "Joueurs en recherche d'équipe";
export { contentType, size } from "@/lib/og/size";

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
