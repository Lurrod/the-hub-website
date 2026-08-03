import { getTeamRecord } from "@/lib/data/matches";
import { getTeam } from "@/lib/data/teams";
import { Avatar, Meta, Stats, Title } from "@/lib/og/fields";
import { renderOg } from "@/lib/og/frame";
import { uploadAsPngDataUri } from "@/lib/og/image";
import { mapDiffLabel, metaLine, recordLabel } from "@/lib/og/labels";

export const alt = "Équipe";
export { contentType, size } from "@/lib/og/size";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const team = await getTeam(id);
  if (!team) return renderOg("ÉQUIPE", () => null);

  const [logo, record] = await Promise.all([uploadAsPngDataUri(team.logo), getTeamRecord(id)]);

  return renderOg("ÉQUIPE", () => (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <Avatar src={logo} name={team.name} />
        <Title>{team.name}</Title>
      </div>
      <Meta>{metaLine([team.tag, team.region])}</Meta>
      <Stats>
        {metaLine([
          recordLabel(record),
          record.played > 0 ? `${mapDiffLabel(record.mapDiff)} maps` : null,
        ])}
      </Stats>
    </>
  ));
}
