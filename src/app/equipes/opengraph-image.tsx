import { db } from "@/lib/db";
import { Stats, Title } from "@/lib/og/fields";
import { renderOg } from "@/lib/og/frame";

export const alt = "Toutes les équipes du Tier 3 Valorant francophone";
export { contentType, size } from "@/lib/og/size";

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
