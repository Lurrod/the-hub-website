import { getActiveMembership, getPlayer } from "@/lib/data/players";
import { db } from "@/lib/db";
import { Avatar, Meta, Stats, Title } from "@/lib/og/fields";
import { renderOg } from "@/lib/og/frame";
import { uploadAsPngDataUri } from "@/lib/og/image";
import { metaLine } from "@/lib/og/labels";
import { ROLE_LABELS, type ValorantRoleKey } from "@/lib/roles";

export const alt = "Joueur";
export { contentType, size } from "@/lib/og/size";

/** Moyennes de carrière du joueur, `null` tant qu'aucune map n'est enregistrée. */
async function careerAverages(playerId: string) {
  const agg = await db.playerGameStat.aggregate({
    where: { playerId },
    _avg: { rating: true, acs: true },
    _sum: { kills: true, deaths: true },
    _count: { _all: true },
  });
  if (agg._count._all === 0) return null;

  const kills = agg._sum.kills ?? 0;
  const deaths = agg._sum.deaths ?? 0;
  return {
    rating: (agg._avg.rating ?? 0).toFixed(2),
    acs: Math.round(agg._avg.acs ?? 0),
    kd: deaths > 0 ? (kills / deaths).toFixed(2) : kills.toFixed(2),
  };
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = await getPlayer(id);
  if (!player) return renderOg("JOUEUR", () => null);

  const [photo, membership, stats] = await Promise.all([
    uploadAsPngDataUri(player.photo),
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
