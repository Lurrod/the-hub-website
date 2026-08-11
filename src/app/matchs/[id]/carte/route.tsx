import { getMatch } from "@/lib/data/matches";
import { dayLabel, timeLabel } from "@/lib/dates";
import { Meta, ScoreRow, Stats } from "@/lib/og/fields";
import { renderOg, SQUARE } from "@/lib/og/frame";
import { uploadAsPngDataUri } from "@/lib/og/image";
import { bestOfLabel, matchBadge, mapsLabel, metaLine, mvpLabel } from "@/lib/og/labels";
import { DISPLAY, MONO, OG } from "@/lib/og/theme";

/**
 * Carte carrée d'un match, téléchargeable depuis la fiche.
 *
 * Elle porte le même cadre que l'aperçu Open Graph de la page, et y ajoute le
 * joueur du match : c'est ce qui distingue une image qu'on poste d'un aperçu
 * de lien qu'on subit.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await getMatch(id);
  // Contrairement aux routes `opengraph-image`, celle-ci n'est pas lue par un
  // robot social : un cadre nu ne rendrait service à personne, un 404 dit ce
  // qui se passe.
  if (!match) return new Response("Match introuvable", { status: 404 });

  const [logoA, logoB] = await Promise.all([
    uploadAsPngDataUri(match.teamA.logo),
    uploadAsPngDataUri(match.teamB.logo),
  ]);

  const played = match.status !== "SCHEDULED";
  const aWin = match.winnerId != null && match.winnerId === match.teamAId;
  const bWin = match.winnerId != null && match.winnerId === match.teamBId;

  // Sur un match à venir, la date remplace le score : elle est l'information
  // que l'affiche transporte.
  const schedule = match.date
    ? metaLine([dayLabel(match.date), match.hasTime ? timeLabel(match.date) : null])
    : "";

  const mvp = mvpLabel(
    match.maps.flatMap((m) =>
      m.stats.map((s) => ({
        pseudo: s.player?.pseudo ?? null,
        riotName: s.riotName,
        rating: s.rating,
        acs: s.acs,
      }))
    )
  );

  return renderOg(
    matchBadge(match.status),
    () => (
      <>
        <Meta>{metaLine([match.tournament.name, match.round, bestOfLabel(match.bestOf)])}</Meta>

        <div style={{ display: "flex", flexDirection: "column", gap: 26, marginTop: 12 }}>
          <ScoreRow
            src={logoA}
            name={match.teamA.name}
            score={played ? String(match.scoreA) : null}
            win={aWin}
          />
          <ScoreRow
            src={logoB}
            name={match.teamB.name}
            score={played ? String(match.scoreB) : null}
            win={bWin}
          />
        </div>

        {/* Le détail des maps sur un match joué, la date sur un match à venir :
            les deux occupent la même ligne, jamais en même temps. */}
        <Stats>{played ? mapsLabel(match.maps) : schedule}</Stats>

        {mvp && (
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 4 }}>
            <div style={{ fontFamily: MONO, fontSize: 24, letterSpacing: 2, color: OG.subtle }}>
              MVP
            </div>
            <div style={{ fontFamily: DISPLAY, fontSize: 30, color: OG.text }}>{mvp}</div>
          </div>
        )}
      </>
    ),
    SQUARE
  );
}
