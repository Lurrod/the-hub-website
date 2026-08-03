import { Meta, Title } from "@/lib/og/fields";
import { renderOg } from "@/lib/og/frame";

export const alt = "Rechercher une équipe, un joueur ou un tournoi";
export { contentType, size } from "@/lib/og/size";

export default async function Image() {
  return renderOg("RECHERCHE", () => (
    <>
      <Title>Rechercher</Title>
      <Meta>Une équipe, un joueur, un tournoi</Meta>
    </>
  ));
}
