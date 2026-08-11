import { getMatch } from "@/lib/data/matches";
import { dayLabel, timeLabel } from "@/lib/dates";
import {
  Meta,
  ScoreRow,
  ScoreboardColumns,
  ScoreboardRow,
  ScoreboardTeam,
  Stats,
} from "@/lib/og/fields";
import { renderOg, SQUARE } from "@/lib/og/frame";
import { uploadAsPngDataUri } from "@/lib/og/image";
import { bestOfLabel, matchBadge, mapsLabel, metaLine, mvpLabel } from "@/lib/og/labels";
import { bySide, kdaLabel, mapRows, seriesRows, type CardStatRow } from "@/lib/og/scoreboard";
import { DISPLAY, MONO, OG } from "@/lib/og/theme";

type Match = NonNullable<Awaited<ReturnType<typeof getMatch>>>;

/** Les trois vues qu'une carte de match peut prendre. */
type View = { kind: "resume" } | { kind: "map"; index: number } | { kind: "serie" };

const MAP_VIEW = /^map-(\d+)$/;

/**
 * Lit le paramètre `vue`. Une valeur inconnue retombe sur le résumé plutôt
 * que d'échouer : ces URL circulent, et une carte qui s'affiche vaut mieux
 * qu'une erreur pour un identifiant qui, lui, est valide.
 */
function parseView(raw: string | null, mapCount: number): View {
  if (raw === "serie") return { kind: "serie" };
  const matched = raw?.match(MAP_VIEW);
  if (matched) {
    const index = Number(matched[1]) - 1;
    if (index >= 0 && index < mapCount) return { kind: "map", index };
  }
  return { kind: "resume" };
}

/** Carte de résultat : le duel, le détail des maps, le joueur du match. */
function resumeCard(match: Match, logoA: string | null, logoB: string | null) {
  const played = match.status !== "SCHEDULED";
  const aWin = match.winnerId != null && match.winnerId === match.teamAId;
  const bWin = match.winnerId != null && match.winnerId === match.teamBId;

  // Sur un match à venir, la date est l'information que l'affiche transporte.
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

  return (
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
  );
}

/** Les cinq lignes d'un camp, sous son en-tête. */
function TeamBlock({
  src,
  name,
  score,
  rows,
}: {
  src: string | null;
  name: string;
  score: string;
  rows: readonly CardStatRow[];
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <ScoreboardTeam src={src} name={name} score={score} />
      {rows.map((row) => (
        <ScoreboardRow
          key={row.key}
          name={row.name}
          agent={row.agent ?? "—"}
          kda={kdaLabel(row)}
          acs={String(Math.round(row.acs))}
          rating={row.rating.toFixed(2)}
        />
      ))}
    </div>
  );
}

/**
 * Carte de scoreboard, commune à la vue d'une map et à celle de la série :
 * seuls le contexte, les scores et la provenance des lignes changent.
 */
function scoreboardCard(
  match: Match,
  logoA: string | null,
  logoB: string | null,
  rows: readonly CardStatRow[],
  scoreA: number,
  scoreB: number,
  context: string
) {
  const { a, b } = bySide(rows);
  return (
    <>
      <Meta>{context}</Meta>
      <ScoreboardColumns />
      <TeamBlock src={logoA} name={match.teamA.name} score={String(scoreA)} rows={a} />
      <TeamBlock src={logoB} name={match.teamB.name} score={String(scoreB)} rows={b} />
    </>
  );
}

/**
 * Carte carrée d'un match, téléchargeable depuis la fiche.
 *
 * Trois vues, choisies par `?vue=` : le résumé du résultat, le scoreboard
 * d'une map (`map-1`, `map-2`, …), et les statistiques cumulées de la série
 * (`serie`). Le paramètre reste un petit ensemble fermé, validé contre les
 * maps réellement jouées.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const view = parseView(new URL(request.url).searchParams.get("vue"), match.maps.length);
  const context = metaLine([match.tournament.name, match.round]);

  if (view.kind === "map") {
    const map = match.maps[view.index];
    return renderOg(
      `SCOREBOARD · ${map.mapName.toUpperCase()}`,
      () =>
        scoreboardCard(
          match,
          logoA,
          logoB,
          mapRows(
            map.stats.map((s) => ({ ...s, pseudo: s.player?.pseudo ?? null, riotName: s.riotName }))
          ),
          map.scoreA,
          map.scoreB,
          context
        ),
      SQUARE
    );
  }

  if (view.kind === "serie") {
    return renderOg(
      `SÉRIE · ${bestOfLabel(match.bestOf).toUpperCase()}`,
      () =>
        scoreboardCard(
          match,
          logoA,
          logoB,
          seriesRows(
            match.maps.flatMap((m) =>
              m.stats.map((s) => ({
                ...s,
                pseudo: s.player?.pseudo ?? null,
                riotName: s.riotName,
              }))
            )
          ),
          match.scoreA,
          match.scoreB,
          metaLine([context, mapsLabel(match.maps)])
        ),
      SQUARE
    );
  }

  return renderOg(matchBadge(match.status), () => resumeCard(match, logoA, logoB), SQUARE);
}
