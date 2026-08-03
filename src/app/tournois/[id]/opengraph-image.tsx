import { TOURNAMENT_FORMAT_LABELS, type TournamentFormat } from "@/lib/constants";
import { getTournament } from "@/lib/data/tournaments";
import { Avatar, Meta, Stats, Title } from "@/lib/og/fields";
import { renderOg } from "@/lib/og/frame";
import { uploadAsPngDataUri } from "@/lib/og/image";
import { dateRangeLabel, metaLine, teamCountLabel, tournamentBadge } from "@/lib/og/labels";

export const alt = "Tournoi";
export { contentType, size } from "@/lib/og/size";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournament = await getTournament(id);
  if (!tournament) return renderOg("TOURNOI", () => null);

  const logo = await uploadAsPngDataUri(tournament.logo);

  return renderOg(tournamentBadge(tournament.status), () => (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <Avatar src={logo} name={tournament.name} />
        <Title>{tournament.name}</Title>
      </div>
      <Meta>
        {metaLine([
          TOURNAMENT_FORMAT_LABELS[tournament.format as TournamentFormat],
          tournament.region,
          dateRangeLabel(tournament.startDate, tournament.endDate),
        ])}
      </Meta>
      <Stats>
        {metaLine([
          teamCountLabel(tournament.participants.length, tournament.maxTeams),
          tournament.prizePool,
        ])}
      </Stats>
    </>
  ));
}
