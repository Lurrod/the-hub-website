import Link from "next/link";
import { notFound } from "next/navigation";
import { getMatch } from "@/lib/data/matches";
import { MATCH_STATUS_LABELS, MATCH_STAGE_LABELS, type MatchStatus } from "@/lib/constants";
import StatusBadge from "@/components/status-badge";
import MatchScoreboard, { type ScoreboardMap, type RoundEntry } from "@/components/match-scoreboard";

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await getMatch(id);
  if (!match) notFound();

  const aWin = match.winnerId != null && match.winnerId === match.teamAId;
  const bWin = match.winnerId != null && match.winnerId === match.teamBId;
  const hasScoreboard =
    match.statsStatus === "MATCHED" && match.maps.some((m) => m.stats.length > 0);
  const scoreboardMaps: ScoreboardMap[] = match.maps.map((m) => ({
    id: m.id,
    mapName: m.mapName,
    scoreA: m.scoreA,
    scoreB: m.scoreB,
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
  const phase =
    match.stage === "BRACKET"
      ? `${MATCH_STAGE_LABELS.BRACKET}${match.round ? ` · ${match.round}` : ""}`
      : `${MATCH_STAGE_LABELS.GROUP}${match.group ? ` · ${match.group.name}` : ""}`;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href={`/tournois/${match.tournamentId}`}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm text-white transition-colors duration-[130ms] hover:border-[var(--accent)] hover:bg-[var(--card-hover)] hover:text-[var(--accent)]"
      >
        {match.tournament.name}
      </Link>

      <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
        <div className="flex justify-center">
          <span className="eyebrow">Match</span>
        </div>

      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-8">
        {/* Équipe A */}
        <Link
          href={`/equipes/${match.teamAId}`}
          className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-end sm:text-right"
        >
          <div className="order-2 min-w-0 sm:order-1">
            <div className={`truncate text-lg font-semibold sm:text-xl ${aWin ? "text-[var(--accent)]" : "text-white"}`}>
              {match.teamA.name}
            </div>
            <div className="stat text-xs text-[var(--text-muted)]">{match.teamA.tag}</div>
          </div>
          {match.teamA.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={match.teamA.logo} alt="" className="order-1 h-14 w-14 rounded-lg object-cover sm:order-2" />
          ) : (
            <div className="monogram order-1 grid h-14 w-14 shrink-0 place-items-center rounded-lg text-base sm:order-2">
              {match.teamA.tag.slice(0, 3).toUpperCase()}
            </div>
          )}
        </Link>

        {/* Score */}
        <div className="stat flex items-center gap-2 text-4xl sm:gap-3 sm:text-5xl">
          <span className={aWin ? "font-bold text-[var(--accent)]" : "text-white"}>{match.scoreA}</span>
          <span className="text-lg text-[var(--text-subtle)] sm:text-2xl">–</span>
          <span className={bWin ? "font-bold text-[var(--accent)]" : "text-white"}>{match.scoreB}</span>
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
            <div className={`truncate text-lg font-semibold sm:text-xl ${bWin ? "text-[var(--accent)]" : "text-white"}`}>
              {match.teamB.name}
            </div>
            <div className="stat text-xs text-[var(--text-muted)]">{match.teamB.tag}</div>
          </div>
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm text-[var(--text-muted)]">
        <span className="stat rounded bg-[var(--surface)] px-1.5 py-0.5 text-[10px] font-medium">BO{match.bestOf}</span>
        <span>{phase}</span>
        <StatusBadge label={MATCH_STATUS_LABELS[match.status as MatchStatus]} status={match.status} />
      </div>

      {match.vodUrl && (
        <div className="mt-4 text-center">
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
      </div>

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold text-white">
          {hasScoreboard ? "Scoreboard" : "Détail des maps"}
        </h2>
        {hasScoreboard ? (
          <MatchScoreboard
            maps={scoreboardMaps}
            teamAName={match.teamA.name}
            teamBName={match.teamB.name}
          />
        ) : match.maps.length === 0 ? (
          <p className="text-[var(--text-muted)]">Aucun détail carte par carte saisi.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
            {match.maps.map((m) => (
              <li key={m.id} className="flex items-center justify-between p-3 text-sm transition-colors hover:bg-[var(--table-row-hover)]">
                <span className="text-white">{m.mapName}</span>
                <span className="stat text-[var(--text-muted)]">
                  {m.scoreA} – {m.scoreB}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
