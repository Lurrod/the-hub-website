import { getActiveMembership, getPlayer } from "@/lib/data/players";
import { getPlayerOverview } from "@/lib/data/player-overview";
import { Avatar, Meta, Stats, StatGrid, Title } from "@/lib/og/fields";
import { renderOg, SQUARE } from "@/lib/og/frame";
import { imageAsPngDataUri } from "@/lib/og/image";
import { agentsLabel, metaLine, statGridValues } from "@/lib/og/labels";
import { ROLE_LABELS, type ValorantRoleKey } from "@/lib/roles";
import { idFromSegment } from "@/lib/slug";

/**
 * Carte carrée d'un joueur, téléchargeable depuis la fiche.
 *
 * Elle reprend le cadre de l'aperçu Open Graph et l'étend à six chiffres de
 * carrière et aux agents principaux — de quoi tenir seule dans un fil, sans le
 * lien qui l'accompagnerait.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: segment } = await params;
  const id = idFromSegment(segment);
  const player = await getPlayer(id);
  if (!player) return new Response("Joueur introuvable", { status: 404 });

  const [photo, membership, overview] = await Promise.all([
    imageAsPngDataUri(player.photo, 320),
    getActiveMembership(id),
    getPlayerOverview(id),
  ]);

  return renderOg(
    "JOUEUR",
    () => (
      <>
        <div style={{ display: "flex", alignItems: "center", gap: 34 }}>
          <Avatar src={photo} name={player.pseudo} size={200} rounded={100} />
          {/* `flex: 1` borne la colonne à la largeur restante : sans elle, le
              `maxWidth` du titre dépasse le cadre sur un pseudo long. */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 12 }}>
            <Title>{player.pseudo}</Title>
            <Meta>
              {metaLine([
                membership?.team.name,
                player.valorantRole ? ROLE_LABELS[player.valorantRole as ValorantRoleKey] : null,
                player.nationality,
              ])}
            </Meta>
          </div>
        </div>

        <StatGrid cells={statGridValues(overview)} />

        <Stats>{agentsLabel(overview.agents)}</Stats>
      </>
    ),
    SQUARE
  );
}
