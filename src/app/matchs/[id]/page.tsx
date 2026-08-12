import Link from "next/link";
import { notFound } from "next/navigation";
import EmptyState, { ListDecor } from "@/components/empty-state";
import { getMatch } from "@/lib/data/matches";
import { getSessionUser, getTournamentManagerIds } from "@/lib/server-auth";
import { canManageTournament } from "@/lib/permissions";
import { MATCH_STAGE_LABELS } from "@/lib/constants";
import { dayLabel, timeLabel } from "@/lib/dates";
import { hasRiotStats } from "@/lib/match-stats-core";
import MatchScoreboard, {
  type ScoreboardMap,
  type RoundEntry,
} from "@/components/match-scoreboard";

import { matchTitle } from "@/lib/data/titles";
import JsonLdScript from "@/components/json-ld";
import ShareCardButton from "@/components/share-card-button";
import { matchJsonLd } from "@/lib/structured-data";
import { pageMetadata } from "@/lib/metadata";
import { matchShareVariants } from "@/lib/og/share-variants";
import { SITE_URL } from "@/lib/site";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const name = await matchTitle(id);
  return pageMetadata({ path: `/matchs/${id}`, title: name ?? "Match" });
}

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await getMatch(id);
  if (!match) notFound();

  const sessionUser = await getSessionUser();
  const canManage = canManageTournament(
    sessionUser,
    await getTournamentManagerIds(match.tournamentId)
  );

  const aWin = match.winnerId != null && match.winnerId === match.teamAId;
  const bWin = match.winnerId != null && match.winnerId === match.teamBId;
  const hasScoreboard =
    hasRiotStats(match.statsStatus) && match.maps.some((m) => m.stats.length > 0);
  const scoreboardMaps: ScoreboardMap[] = match.maps.map((m) => ({
    id: m.id,
    mapName: m.mapName,
    scoreA: m.scoreA,
    scoreB: m.scoreB,
    durationSec: m.durationSec,
    rounds: (Array.isArray(m.roundTimeline) ? m.roundTimeline : []) as RoundEntry[],
    stats: m.stats.map((s) => ({
      id: s.id,
      playerId: s.playerId,
      pseudo: s.player?.pseudo ?? null,
      riotName: s.riotName,
      teamSide: s.teamSide,
      agent: s.agent,
      kills: s.kills,
      deaths: s.deaths,
      assists: s.assists,
      acs: s.acs,
      adr: s.adr,
      rating: s.rating,
      kast: s.kast,
      firstKills: s.firstKills,
      firstDeaths: s.firstDeaths,
    })),
  }));
  const shareVariants = matchShareVariants({
    ...match,
    maps: match.maps.map((m) => ({ mapName: m.mapName, statCount: m.stats.length })),
  });

  const stageLabel =
    match.stage === "BRACKET" ? MATCH_STAGE_LABELS.BRACKET : MATCH_STAGE_LABELS.GROUP;
  const stageExtra = match.stage === "BRACKET" ? match.round : (match.group?.name ?? null);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <JsonLdScript
        data={matchJsonLd({
          id: match.id,
          date: match.date,
          teamA: match.teamA,
          teamB: match.teamB,
          tournamentName: match.tournament.name,
        })}
      />
      {/* Le bandeau affiche l'affiche du match en trois blocs (équipe / score /
          équipe) : aucun d'eux ne peut porter à lui seul le titre du document.
          Le H1 est donc posé en `sr-only` — il donne aux lecteurs d'écran et
          aux moteurs le point d'entrée qui manquait, sans rien changer au
          rendu visuel. */}
      <h1 className="sr-only">
        {match.teamA.name} vs {match.teamB.name}
      </h1>
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-8">
          {/* Équipe A */}
          <Link
            href={`/equipes/${match.teamAId}`}
            className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-end sm:text-right"
          >
            <div className="order-2 min-w-0 sm:order-1">
              <div
                style={{ fontSize: "18px" }}
                className={`truncate font-semibold ${aWin ? "text-[var(--accent)]" : "text-white"}`}
              >
                {match.teamA.name}
              </div>
              <div className="stat text-xs text-[var(--text-muted)]">{match.teamA.tag}</div>
            </div>
            {match.teamA.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={match.teamA.logo}
                alt=""
                className="order-1 h-14 w-14 rounded-lg object-cover sm:order-2"
              />
            ) : (
              <div className="monogram order-1 grid h-14 w-14 shrink-0 place-items-center rounded-lg text-base sm:order-2">
                {match.teamA.tag.slice(0, 3).toUpperCase()}
              </div>
            )}
          </Link>

          {/* Score */}
          <div className="stat flex items-center gap-2 sm:gap-3">
            <span
              style={{ fontSize: "24px" }}
              className={aWin ? "font-bold text-[var(--accent)]" : "text-white"}
            >
              {match.scoreA}
            </span>
            <span style={{ fontSize: "16px" }} className="text-[var(--text-subtle)]">
              -
            </span>
            <span
              style={{ fontSize: "24px" }}
              className={bWin ? "font-bold text-[var(--accent)]" : "text-white"}
            >
              {match.scoreB}
            </span>
          </div>

          {/* Équipe B */}
          <Link
            href={`/equipes/${match.teamBId}`}
            className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-start sm:text-left"
          >
            {match.teamB.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={match.teamB.logo} alt="" className="h-14 w-14 rounded-lg object-cover" />
            ) : (
              <div className="monogram grid h-14 w-14 shrink-0 place-items-center rounded-lg text-base">
                {match.teamB.tag.slice(0, 3).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div
                style={{ fontSize: "18px" }}
                className={`truncate font-semibold ${bWin ? "text-[var(--accent)]" : "text-white"}`}
              >
                {match.teamB.name}
              </div>
              <div className="stat text-xs text-[var(--text-muted)]">{match.teamB.tag}</div>
            </div>
          </Link>
        </div>

        {match.vodUrl && (
          <div className="mt-6 text-center">
            <a
              href={match.vodUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block rounded-[var(--r-sm)] bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)]"
            >
              Voir la VOD
            </a>
          </div>
        )}

        {/* Bas du bandeau : à gauche le tournoi, à droite le stage + le BO */}
        {/* `flex-wrap` : la ligne porte le tournoi, la date, le stage, le
            format, le partage et parfois « Gérer ». Sur un écran étroit elle
            ne tient pas, et sans repli c'est la page entière qui défilait à
            l'horizontale. */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
          <Link
            href={`/tournois/${match.tournamentId}`}
            className="group flex min-w-0 items-center gap-2"
          >
            {match.tournament.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={match.tournament.logo}
                alt=""
                className="h-8 w-8 shrink-0 rounded object-cover"
              />
            ) : (
              <div className="monogram grid h-8 w-8 shrink-0 place-items-center rounded text-[10px]">
                {match.tournament.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="truncate text-sm font-medium text-white transition-colors group-hover:text-[var(--accent)]">
              {match.tournament.name}
            </span>
          </Link>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
            {match.date && (
              <span className="flex items-center">
                {dayLabel(match.date)}
                {match.hasTime && (
                  <>
                    <span className="dot-sep">·</span>
                    <span className="stat">{timeLabel(match.date, true)}</span>
                  </>
                )}
              </span>
            )}
            <span className="flex items-center">
              {stageLabel}
              {stageExtra && (
                <>
                  <span className="dot-sep">·</span>
                  {stageExtra}
                </>
              )}
            </span>
            <span className="stat rounded bg-[var(--bg)] px-1.5 py-0.5 text-[10px] font-medium">
              BO{match.bestOf}
            </span>
            <ShareCardButton
              variants={shareVariants}
              pageUrl={`${SITE_URL}/matchs/${match.id}`}
              title="Partager le match"
              alt={`Carte du match ${match.teamA.name} contre ${match.teamB.name}`}
            />
            {canManage && (
              <Link
                href={`/tournois/${match.tournamentId}/gestion/matchs/${match.id}`}
                className="rounded bg-[var(--accent)] px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-[var(--accent-hover)]"
              >
                Gérer
              </Link>
            )}
          </div>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="mb-3 text-base font-semibold text-[var(--accent)]">
          {hasScoreboard ? "Tableau des scores" : "Détail des maps"}
        </h2>
        {hasScoreboard ? (
          <MatchScoreboard
            maps={scoreboardMaps}
            teamAName={match.teamA.name}
            teamBName={match.teamB.name}
            teamATag={match.teamA.tag}
            teamBTag={match.teamB.tag}
            teamALogo={match.teamA.logo}
            teamBLogo={match.teamB.logo}
          />
        ) : match.maps.length === 0 ? (
          <EmptyState
            title="Aucun détail carte par carte"
            description="Le scoreboard de chaque carte — rating, ACS, KAST, ADR, premiers duels — apparaîtra ici une fois la partie importée depuis Riot."
            decor={<ListDecor />}
          />
        ) : (
          <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
            {match.maps.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between p-3 text-sm transition-colors hover:bg-[var(--table-row-hover)]"
              >
                <span className="text-white">{m.mapName}</span>
                <span className="stat text-[var(--text-muted)]">
                  {m.scoreA} - {m.scoreB}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
