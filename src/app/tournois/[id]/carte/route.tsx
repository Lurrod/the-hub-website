import { listBracketMatches } from "@/lib/data/matches";
import { getTournament } from "@/lib/data/tournaments";
import { buildBracket, type BracketRound } from "@/lib/bracket";
import type { TournamentFormat } from "@/lib/constants";
import { displayScores } from "@/lib/forfeit";
import { Avatar, Meta } from "@/lib/og/fields";
import { renderOg, SQUARE } from "@/lib/og/frame";
import { imageAsPngDataUri } from "@/lib/og/image";
import { DISPLAY, MONO, OG } from "@/lib/og/theme";

/**
 * Carte carrée d'un bracket, téléchargeable depuis la page du tournoi.
 *
 * L'arbre est composé en colonnes flex et non en grille : Satori ne connaît
 * pas `display: grid`, et la page du site s'appuie dessus. Chaque colonne
 * répartit ses confrontations avec `space-around`, ce qui aligne naturellement
 * un tour de quatre sur un tour de deux sans calcul de position.
 *
 * Seuls les derniers tours sont montrés. Un bracket de seize équipes rendu en
 * entier donnerait des cases illisibles ; la fin de tournoi est de toute façon
 * ce qu'on partage.
 */

export const dynamic = "force-dynamic";

/** Tours affichés au maximum : au-delà, les cases deviennent illisibles. */
const MAX_ROUNDS = 3;

type Seat = { tag: string; score: string; won: boolean } | null;

/** Une case de l'arbre : deux camps, ou un emplacement vide (exempt). */
function Bout({ top, bottom }: { top: Seat; bottom: Seat }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 250,
        borderRadius: 14,
        border: `2px solid ${OG.border}`,
        backgroundColor: OG.card,
        overflow: "hidden",
      }}
    >
      {[top, bottom].map((s, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px",
            borderBottom: i === 0 ? `2px solid ${OG.border}` : "none",
          }}
        >
          <div
            style={{
              fontFamily: DISPLAY,
              fontSize: 30,
              color: s ? (s.won ? OG.text : OG.muted) : OG.subtle,
            }}
          >
            {s ? s.tag : "—"}
          </div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 30,
              color: s ? (s.won ? OG.accent : OG.subtle) : OG.subtle,
            }}
          >
            {s ? s.score : ""}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Convertit un tour de l'arbre en cases prêtes à dessiner. */
function seats(round: BracketRound) {
  return round.slots.map((slot) => {
    if (slot.kind === "bye") return { key: slot.key, top: null, bottom: null };
    const m = slot.match;
    // Une égalité — un match encore en cours de saisie — ne désigne personne.
    // Le forfait laisse le score à 0-0 : le vainqueur enregistré fait foi.
    const aWon = m.winnerId ? m.winnerId === m.teamAId : m.scoreA > m.scoreB;
    const bWon = m.winnerId ? m.winnerId === m.teamBId : m.scoreB > m.scoreA;
    const score = displayScores(m);
    return {
      key: slot.key,
      top: { tag: m.teamA?.tag ?? "?", score: score.a, won: aWon },
      bottom: { tag: m.teamB?.tag ?? "?", score: score.b, won: bWon },
    };
  });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [tournament, matches] = await Promise.all([getTournament(id), listBracketMatches(id)]);
  if (!tournament) return new Response("Tournoi introuvable", { status: 404 });

  const logo = await imageAsPngDataUri(tournament.logo);
  const tree = buildBracket(
    matches.map((m) => ({
      id: m.id,
      round: m.round,
      forfeit: m.forfeit,
      status: m.status,
      // Sans eux, la carte retombait sur le « 1 - 0 » de série alors que le
      // bracket du site affiche le score de la map sur un BO1.
      bestOf: m.bestOf,
      maps: m.maps,
      groupId: m.groupId,
      groupName: m.group?.name ?? null,
      teamAId: m.teamAId,
      teamBId: m.teamBId,
      scoreA: m.scoreA,
      scoreB: m.scoreB,
      winnerId: m.winnerId,
      position: m.bracketPosition,
      teamA: m.teamA,
      teamB: m.teamB,
    })),
    tournament.format as TournamentFormat
  );

  // On dessine la section en arbre : c'est la seule où un tour mène au
  // suivant. Un lower bracket est rendu en colonnes, sans cette garantie.
  const section = tree.sections.find((s) => s.key === "single" || s.key === "upper");
  const rounds = (section?.rounds ?? []).slice(-MAX_ROUNDS);

  return renderOg(
    "BRACKET",
    () => (
      <>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <Avatar src={logo} name={tournament.name} size={110} rounded={18} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div
              style={{
                fontFamily: DISPLAY,
                fontSize: tournament.name.length > 24 ? 46 : 58,
                color: OG.text,
                lineHeight: 1.05,
                maxWidth: 700,
              }}
            >
              {tournament.name}
            </div>
          </div>
        </div>

        {rounds.length === 0 ? (
          <Meta>Bracket non encore saisi</Meta>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "stretch",
              justifyContent: "space-between",
              gap: 24,
              flex: 1,
            }}
          >
            {rounds.map((round) => (
              <div
                key={round.name}
                style={{ display: "flex", flexDirection: "column", flex: 1, gap: 14 }}
              >
                {/* Centrée comme les cases de la colonne : alignée à gauche,
                    l'étiquette d'un tour à une seule case flottait à côté. */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    fontFamily: MONO,
                    fontSize: 22,
                    letterSpacing: 2,
                    color: OG.subtle,
                    textTransform: "uppercase",
                  }}
                >
                  {round.name}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-around",
                    alignItems: "center",
                    flex: 1,
                  }}
                >
                  {seats(round).map((s) => (
                    <Bout key={s.key} top={s.top} bottom={s.bottom} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </>
    ),
    SQUARE
  );
}
