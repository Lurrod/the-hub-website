import { getActiveMembership, getPlayer } from "@/lib/data/players";
import { playerCareerAverages } from "@/lib/data/counts";
import { Avatar, Meta, Stats, Title } from "@/lib/og/fields";
import { renderOg } from "@/lib/og/frame";
import { imageAsPngDataUri } from "@/lib/og/image";
import { metaLine } from "@/lib/og/labels";
import { ROLE_LABELS, type ValorantRoleKey } from "@/lib/roles";

export const alt = "Joueur";
export { contentType, size } from "@/lib/og/size";

/** Mise en forme des moyennes pour l'image : la requête vit dans la couche données. */
async function careerAverages(playerId: string) {
  const agg = await playerCareerAverages(playerId);
  if (!agg) return null;
  return {
    rating: agg.rating.toFixed(2),
    acs: Math.round(agg.acs),
    kd: agg.deaths > 0 ? (agg.kills / agg.deaths).toFixed(2) : agg.kills.toFixed(2),
  };
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = await getPlayer(id);
  if (!player) return renderOg("JOUEUR", () => null);

  const [photo, membership, stats] = await Promise.all([
    imageAsPngDataUri(player.photo),
    getActiveMembership(id),
    careerAverages(id),
  ]);

  return renderOg("JOUEUR", () => (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <Avatar src={photo} name={player.pseudo} rounded={60} />
        <Title>{player.pseudo}</Title>
      </div>
      <Meta>
        {metaLine([
          membership?.team.name,
          player.valorantRole ? ROLE_LABELS[player.valorantRole as ValorantRoleKey] : null,
          player.nationality,
        ])}
      </Meta>
      <Stats>
        {stats ? metaLine([`Rating ${stats.rating}`, `ACS ${stats.acs}`, `K/D ${stats.kd}`]) : ""}
      </Stats>
    </>
  ));
}
