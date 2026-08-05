import Link from "next/link";
import { notFound } from "next/navigation";
import { getTournament, getTournamentTeamsWithPlayers } from "@/lib/data/tournaments";
import { listTournamentMatches, getGroupsWithMatches, listBracketMatches } from "@/lib/data/matches";
import { getTournamentStats } from "@/lib/data/tournament-stats";
import { getTournamentTeamStats } from "@/lib/data/tournament-teams";
import TournamentTabs from "@/components/tournament-tabs";
import TournamentStats from "@/components/tournament-stats";
import MatchMiniList from "@/components/match-mini-list";
import TournamentMatchList from "@/components/tournament-match-list";
import StageMenu from "@/components/stage-menu";
import ParticipantCard from "@/components/participant-card";
import { getSessionUser, getTournamentManagerIds } from "@/lib/server-auth";
import { canManageTournament } from "@/lib/permissions";
import { listTeamsManagedBy, countActiveRosterPlayers } from "@/lib/data/teams";
import TournamentRegister, { type RegistrableTeam } from "@/components/tournament-register";
import StandingsTable from "@/components/standings-table";
import Bracket from "@/components/bracket";
import TournamentTeams from "@/components/tournament-teams";
import { computeStandings } from "@/lib/standings";
import type { ReactNode } from "react";

import { tournamentTitle } from "@/lib/data/titles";
import JsonLdScript from "@/components/json-ld";
import { tournamentJsonLd } from "@/lib/structured-data";
import { pageMetadata } from "@/lib/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const name = await tournamentTitle(id);
  return pageMetadata({ path: `/tournois/${id}`, title: name ?? "Tournoi" });
}

export default async function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournament = await getTournament(id);
  if (!tournament) notFound();

  const sessionUser = await getSessionUser();
  const canManage = canManageTournament(sessionUser, await getTournamentManagerIds(id));

  const [participants, allMatches, groups, bracket, stats, teamStats] = await Promise.all([
    getTournamentTeamsWithPlayers(id),
    listTournamentMatches(id),
    getGroupsWithMatches(id),
    listBracketMatches(id),
    getTournamentStats(id),
    getTournamentTeamStats(id),
  ]);

  // Étapes : chaque poule → son classement ; les playoffs → l'arbre du bracket.
  const stageDefs: { key: string; label: string; content: ReactNode }[] = [];
  for (const g of groups) {
    const teamById = new Map(g.participants.map((p) => [p.teamId, p.team]));
    const standings = computeStandings(
      g.participants.map((p) => p.teamId),
      g.matches.map((m) => ({
        teamAId: m.teamAId,
        teamBId: m.teamBId,
        scoreA: m.scoreA,
        scoreB: m.scoreB,
      }))
    );
    const rows = standings.map((s) => {
      const team = teamById.get(s.teamId);
      return {
        teamId: s.teamId,
        teamName: team?.name ?? s.teamId,
        teamTag: team?.tag ?? "?",
        played: s.played,
        wins: s.wins,
        losses: s.losses,
        mapDiff: s.mapDiff,
      };
    });
    stageDefs.push({ key: `g-${g.id}`, label: g.name, content: <StandingsTable rows={rows} /> });
  }
  if (bracket.length > 0) {
    stageDefs.push({
      key: "playoffs",
      label: "Playoffs",
      content: (
        <Bracket
          format={tournament.format}
          matches={bracket.map((m) => ({
            id: m.id,
            round: m.round,
            teamAId: m.teamAId,
            teamBId: m.teamBId,
            scoreA: m.scoreA,
            scoreB: m.scoreB,
            winnerId: m.winnerId,
            position: m.bracketPosition,
            teamA: m.teamA ? { tag: m.teamA.tag } : null,
            teamB: m.teamB ? { tag: m.teamB.tag } : null,
          }))}
        />
      ),
    });
  }

  const upcoming = allMatches.filter((m) => m.status === "SCHEDULED" || m.status === "LIVE");
  const stageLabel = (m: (typeof allMatches)[number]) =>
    m.group ? m.group.name : m.round ?? "Playoffs";

  const teamCount = tournament.participants.length;

  // Équipes que l'utilisateur gère, avec leur effectif : sert à proposer (ou non)
  // l'inscription au tournoi.
  const registeredIds = new Set(tournament.participants.map((p) => p.teamId));
  const managedTeams = sessionUser ? await listTeamsManagedBy(sessionUser.id) : [];
  const myTeams: RegistrableTeam[] = await Promise.all(
    managedTeams.map(async (t) => ({
      id: t.id,
      name: t.name,
      players: await countActiveRosterPlayers(t.id),
      registered: registeredIds.has(t.id),
    }))
  );

  const fmt = (d: Date | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : null);
  const dateRange =
    [fmt(tournament.startDate), fmt(tournament.endDate)].filter(Boolean).join(" - ") ||
    "Dates à définir";

  const apercu = (
    // min-w-0 sur les deux colonnes : sous `lg` la grille n'a qu'une colonne
    // implicite en `min-width: auto`, donc l'arbre imposait sa largeur a la
    // piste et faisait defiler la PAGE entiere au lieu de defiler lui-meme.
    <div className="grid gap-6 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
      <section className="min-w-0 self-start">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
          Matchs à venir
        </h2>
        <MatchMiniList
          empty="Aucun match à venir."
          matches={upcoming.map((m) => ({
            id: m.id,
            date: m.date,
            teamA: m.teamA ? { tag: m.teamA.tag, logo: m.teamA.logo } : null,
            teamB: m.teamB ? { tag: m.teamB.tag, logo: m.teamB.logo } : null,
          }))}
        />
      </section>

      <div className="min-w-0 space-y-8">
        {stageDefs.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
              Étapes
            </h2>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
              <StageMenu stages={stageDefs} />
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
            Équipes participantes
          </h2>
          <div className="mb-4">
            <TournamentRegister
              tournamentId={id}
              status={tournament.status}
              teams={myTeams}
              teamCount={teamCount}
              maxTeams={tournament.maxTeams}
            />
          </div>
          {participants.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">Aucune équipe inscrite.</p>
          ) : (
            <div className="flex flex-wrap gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
              {participants.map((p) => (
                <ParticipantCard
                  key={p.id}
                  p={{
                    teamId: p.teamId,
                    name: p.team.name,
                    logo: p.team.logo,
                    players: p.team.memberships
                      .filter((m) => m.role !== "COACH" && m.role !== "MANAGER")
                      .slice(0, 5)
                      .map((m) => ({ id: m.player.id, pseudo: m.player.pseudo })),
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );

  const matchesTab = (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
        Matches
      </h2>
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <TournamentMatchList
      matches={allMatches.map((m) => ({
        id: m.id,
        date: m.date,
        status: m.status,
        scoreA: m.scoreA,
        scoreB: m.scoreB,
        stageLabel: stageLabel(m),
        teamA: m.teamA ? { name: m.teamA.name, logo: m.teamA.logo } : null,
        teamB: m.teamB ? { name: m.teamB.name, logo: m.teamB.logo } : null,
      }))}
        />
      </div>
    </div>
  );

  const equipesTab = <TournamentTeams teams={teamStats} />;

  const statsTab = stats.hasData ? (
    <TournamentStats
      tournamentRecords={stats.tournamentRecords}
      records={stats.records}
      averages={stats.averages}
      totals={stats.totals}
      players={stats.players}
    />
  ) : (
    <div className="rounded-lg border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--text-muted)]">
      Aucune statistique disponible pour le moment.
    </div>
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <JsonLdScript data={tournamentJsonLd(tournament)} />
      <TournamentTabs
        header={
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
            {tournament.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tournament.logo}
                alt=""
                className="h-16 w-16 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-[var(--surface)] text-[var(--text-muted)]">
                {tournament.name.slice(0, 2).toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-white">{tournament.name}</h1>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">{dateRange}</p>
            </div>

            <div className="flex items-center gap-8 sm:ml-auto">
              <div className="text-left">
                <div className="text-xs font-semibold text-white">
                  {tournament.maxTeams != null ? `${teamCount}/${tournament.maxTeams}` : teamCount}
                </div>
                <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                  équipes
                </div>
              </div>
              <div className="text-left">
                <div className="text-xs font-semibold text-white">{tournament.prizePool ?? "-"}</div>
                <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                  cash prize
                </div>
              </div>
              {canManage && (
                <Link
                  href={`/tournois/${id}/gestion`}
                  className="rounded bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white"
                >
                  Gérer
                </Link>
              )}
            </div>
          </div>
        }
        tabs={[
          { key: "apercu", label: "Aperçu", content: apercu },
          { key: "matches", label: "Matches", content: matchesTab },
          { key: "stats", label: "Stats", content: statsTab },
          { key: "equipes", label: "Équipes", content: equipesTab },
        ]}
      />
    </main>
  );
}
