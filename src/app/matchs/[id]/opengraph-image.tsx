import { getMatch } from "@/lib/data/matches";
import { Avatar, Meta, Stats } from "@/lib/og/fields";
import { renderOg } from "@/lib/og/frame";
import { imageAsPngDataUri } from "@/lib/og/image";
import { displayScores } from "@/lib/forfeit";
import { bestOfLabel, mapsLabel, matchBadge, metaLine } from "@/lib/og/labels";
import { DISPLAY, OG } from "@/lib/og/theme";
import { idFromSegment } from "@/lib/slug";

export const alt = "Match";
export { contentType, size } from "@/lib/og/size";

/** Un côté du duel : logo au-dessus, nom en dessous, sur une colonne fixe. */
function Side({ src, name }: { src: string | null; name: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        width: 380,
      }}
    >
      <Avatar src={src} name={name} size={128} />
      <div
        style={{
          fontFamily: DISPLAY,
          fontSize: name.length > 16 ? 32 : 40,
          color: OG.text,
          textAlign: "center",
        }}
      >
        {name}
      </div>
    </div>
  );
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id: segment } = await params;
  const id = idFromSegment(segment);
  const match = await getMatch(id);
  if (!match) return renderOg("MATCH", () => null);

  const [logoA, logoB] = await Promise.all([
    imageAsPngDataUri(match.teamA.logo),
    imageAsPngDataUri(match.teamB.logo),
  ]);

  // Le score n'a de sens qu'une fois le match commencé : avant, la carte
  // annonce l'affiche, pas un 0 – 0 qui se lirait comme un résultat.
  const ff = displayScores(match);
  const center = match.status === "SCHEDULED" ? "VS" : `${ff.a} – ${ff.b}`;

  return renderOg(matchBadge(match.status), () => (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Side src={logoA} name={match.teamA.name} />
        <div style={{ fontFamily: DISPLAY, fontSize: 72, color: OG.accent }}>{center}</div>
        <Side src={logoB} name={match.teamB.name} />
      </div>
      <Meta>{metaLine([match.tournament.name, match.round, bestOfLabel(match.bestOf)])}</Meta>
      <Stats>{mapsLabel(match.maps)}</Stats>
    </>
  ));
}
