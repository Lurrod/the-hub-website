import { db } from "@/lib/db";
import { Stats, Title } from "@/lib/og/fields";
import { renderOg } from "@/lib/og/frame";

export const alt = "Tous les matchs du Tier 3 Valorant francophone";
export { contentType, size } from "@/lib/og/size";

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
