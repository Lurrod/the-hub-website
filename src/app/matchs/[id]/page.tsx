import Link from "next/link";
import { notFound } from "next/navigation";
import EmptyState, { EmptyLine, ListDecor } from "@/components/empty-state";
import {
  getHeadToHead,
  getMatch,
  listTeamRecentMatches,
  TEAM_FORM_LIMIT,
} from "@/lib/data/matches";
import { formEntries, type MatchCutoff } from "@/lib/match-context-core";
import MatchRow from "@/components/match-row";
import TeamFormColumn from "@/components/team-form-column";
import { getSessionUser, getTournamentManagerIds } from "@/lib/server-auth";
import { canManageTournament } from "@/lib/permissions";
import { MATCH_STAGE_LABELS } from "@/lib/constants";
import { dayLabel, timeLabel } from "@/lib/dates";
import { hasRiotStats } from "@/lib/match-stats-core";
import MatchScoreboard, {
  type ScoreboardMap,
  type RoundEntry,
} from "@/components/match-scoreboard";

import { matchSeo } from "@/lib/data/titles";
import JsonLdScript from "@/components/json-ld";
import ShareCardButton from "@/components/share-card-button";
import { matchJsonLd } from "@/lib/structured-data";
import { pageMetadata } from "@/lib/metadata";
import { matchShareVariants } from "@/lib/og/share-variants";
import { SITE_URL } from "@/lib/site";
import { displayScores } from "@/lib/forfeit";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const seo = await matchSeo(id);
  return pageMetadata({
    path: `/matchs/${id}`,
    title: seo?.title ?? "Match",
    description: seo?.description,
  });
}

/** Le camp qui mène est mis en avant ; l'autre reste blanc, comme au bandeau. */
function tallyClass(mine: number, theirs: number) {
  return mine > theirs ? "font-bold text-[var(--accent)]" : "text-white";
}

/**
 * Un côté de l'en-tête des confrontations : logo et nom, tournés vers le
 * score. Le nom passe au tag sous `sm` — « Team Vitality » et « FNATIC » de
 * part et d'autre d'un score ne tiennent pas sur un téléphone.
 */
function TallySide({
  team,
  align,
}: {
  team: { name: string; tag: string; logo: string | null };
  align: "left" | "right";
}) {
  return (
    <div
      className={`flex min-w-0 items-center gap-2 ${
        align === "left" ? "flex-row-reverse justify-start" : "justify-start"
      }`}
    >
      {team.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          loading="lazy"
          decoding="async"
          src={team.logo}
          alt={`Logo ${team.name}`}
          className="h-5 w-5 shrink-0 rounded object-cover"
        />
      ) : (
        <div className="monogram grid h-5 w-5 shrink-0 place-items-center rounded text-[8px]">
          {team.tag.slice(0, 3).toUpperCase()}
        </div>
      )}
      <span className="hidden truncate text-sm font-medium text-white sm:block">{team.name}</span>
      <span className="stat truncate text-xs text-[var(--text-muted)] sm:hidden">{team.tag}</span>
    </div>
  );
}

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await getMatch(id);
  if (!match) notFound();

  const cutoff: MatchCutoff = { notAfter: match.date, excludeMatchId: match.id };
  // Les cinq requêtes sont indépendantes : les enchaîner allongeait le rendu
  // pour rien.
  const [sessionUser, managerIds, h2h, recentA, recentB] = await Promise.all([
    getSessionUser(),
    getTournamentManagerIds(match.tournamentId),
    getHeadToHead(match.teamAId, match.teamBId, cutoff),
    listTeamRecentMatches(match.teamAId, TEAM_FORM_LIMIT, cutoff),
    listTeamRecentMatches(match.teamBId, TEAM_FORM_LIMIT, cutoff),
  ]);
  const canManage = canManageTournament(sessionUser, managerIds);

  const hasHeadToHead = h2h.matches.length > 0;
  const hasForm = recentA.length > 0 || recentB.length > 0;

  const aWin = match.winnerId != null && match.winnerId === match.teamAId;
  const bWin = match.winnerId != null && match.winnerId === match.teamBId;
  // Sur un forfait le score chiffré ne raconte rien : la fiche affiche W / FF,
  // comme les cases du bracket.
  const score = displayScores(match);
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
                className={`n-18 truncate font-semibold ${aWin ? "text-[var(--accent)]" : "text-white"}`}
              >
                {match.teamA.name}
              </div>
              <div className="stat text-xs text-[var(--text-muted)]">{match.teamA.tag}</div>
            </div>
            {match.teamA.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={match.teamA.logo}
                alt={`Logo ${match.teamA.name}`}
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
            <span className={`n-24 ${aWin ? "font-bold text-[var(--accent)]" : "text-white"}`}>
              {score.a}
            </span>
            <span className="n-16 text-[var(--text-subtle)]">-</span>
            <span className={`n-24 ${bWin ? "font-bold text-[var(--accent)]" : "text-white"}`}>
              {score.b}
            </span>
          </div>

          {/* Équipe B */}
          <Link
            href={`/equipes/${match.teamBId}`}
            className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-start sm:text-left"
          >
            {match.teamB.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={match.teamB.logo}
                alt={`Logo ${match.teamB.name}`}
                className="h-14 w-14 rounded-lg object-cover"
              />
            ) : (
              <div className="monogram grid h-14 w-14 shrink-0 place-items-center rounded-lg text-base">
                {match.teamB.tag.slice(0, 3).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div
                className={`n-18 truncate font-semibold ${bWin ? "text-[var(--accent)]" : "text-white"}`}
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
              className="inline-block rounded-[var(--r-sm)] bg-[var(--accent)] px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--accent-hover)]"
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
                alt={`Logo ${match.tournament.name}`}
                loading="lazy"
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
                className="rounded bg-[var(--accent)] px-2.5 py-1 text-xs font-medium transition-colors hover:bg-[var(--accent-hover)]"
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

      {/* Pas de forme implique pas de confrontation : les deux requêtes portent les
          mêmes bornes, donc ce seul drapeau suffit à masquer les deux sections. */}
      {hasForm && (
        <>
          <section className="mt-10">
            <h2 className="mb-3 text-base font-semibold text-[var(--accent)]">
              Confrontations directes
            </h2>
            {hasHeadToHead ? (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 sm:p-4">
                {/* Le bilan reprend l'affiche du bandeau — logo, nom, score — sur
                    un fond plus clair : c'est l'en-tête de la liste qui suit, pas
                    une ligne parmi elles. */}
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-[var(--r-sm)] bg-[var(--card-hover)] px-3 py-1.5">
                  <TallySide team={match.teamA} align="left" />
                  <p className="stat flex items-center gap-1.5 text-lg">
                    {/* Les noms d'équipe vivent maintenant dans les deux
                        colonnes voisines : sans ce rappel, le bilan se lirait
                        « 1 - 4 » sans dire de qui. */}
                    <span className="sr-only">
                      Bilan des confrontations, {match.teamA.name} contre {match.teamB.name} :{" "}
                    </span>
                    <span className={tallyClass(h2h.winsA, h2h.winsB)}>{h2h.winsA}</span>
                    <span className="text-[var(--text-subtle)]">-</span>
                    <span className={tallyClass(h2h.winsB, h2h.winsA)}>{h2h.winsB}</span>
                  </p>
                  <TallySide team={match.teamB} align="right" />
                </div>
                {h2h.truncated && (
                  <p className="mt-3 text-center text-xs text-[var(--text-muted)]">
                    Sur les {h2h.limit} dernières rencontres.
                  </p>
                )}
                {/* Même filet que l'index des matchs et que la colonne de
                    forme juste en dessous : cinq lignes de score identiques se
                    distinguent mal sans séparation. */}
                <ul className="mt-3 divide-y divide-[var(--border)]">
                  {h2h.matches.map((m) => (
                    <li key={m.id}>
                      <MatchRow bare withYear match={{ ...m, contextLabel: m.tournament.name }} />
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              // Une équipe n'a jamais rencontré l'autre : c'est une information,
              // pas un manque. Un `EmptyState` avec décor serait disproportionné
              // pour cette seule phrase de constat.
              <EmptyLine>Première rencontre entre les deux équipes.</EmptyLine>
            )}
          </section>

          <section className="mt-10">
            <h2 className="mb-3 text-base font-semibold text-[var(--accent)]">Forme récente</h2>
            {/* Même encadré que les confrontations, pour que les deux blocs de
                contexte se lisent comme une seule zone sous le scoreboard.
                Point de rupture aligné sur le bandeau du haut de page. */}
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 sm:p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <TeamFormColumn
                  team={match.teamA}
                  align="left"
                  entries={formEntries(recentA, match.teamAId)}
                />
                <TeamFormColumn
                  team={match.teamB}
                  align="right"
                  entries={formEntries(recentB, match.teamBId)}
                />
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
