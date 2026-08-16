import Link from "next/link";
import { notFound } from "next/navigation";
import { getTournament, getTournamentTeamsWithPlayers } from "@/lib/data/tournaments";
import {
  listTournamentMatches,
  getGroupsWithMatches,
  listBracketMatches,
} from "@/lib/data/matches";
import { getTournamentStats } from "@/lib/data/tournament-stats";
import { getTournamentTeamStats } from "@/lib/data/tournament-teams";
import TournamentTabs from "@/components/tournament-tabs";
import ShareCardButton from "@/components/share-card-button";
import { tournamentShareVariants } from "@/lib/og/share-variants";
import { SITE_URL } from "@/lib/site";
import EmptyState, { RosterDecor, StatsDecor } from "@/components/empty-state";
import TournamentStats from "@/components/tournament-stats";
import MatchSideColumn from "@/components/match-side-column";
import TournamentMatchList from "@/components/tournament-match-list";
import StageMenu from "@/components/stage-menu";
import ParticipantCard from "@/components/participant-card";
import SocialLinks from "@/components/social-links";
import { getSessionUser, getTournamentManagerIds } from "@/lib/server-auth";
import { canManageTournament } from "@/lib/permissions";
import { listTeamsManagedBy, countActiveRosterPlayers } from "@/lib/data/teams";
import TournamentRegister, { type RegistrableTeam } from "@/components/tournament-register";
import StandingsTable from "@/components/standings-table";
import Bracket from "@/components/bracket";
import TournamentTeams from "@/components/tournament-teams";
import { buildStandingRows } from "@/lib/standings";
import { STAGES_BY_FORMAT } from "@/lib/constants";
import { isRegistrationOpen } from "@/lib/tournament-status";
import type { ReactNode } from "react";

import { tournamentTitle } from "@/lib/data/titles";
import JsonLdScript from "@/components/json-ld";
import { tournamentJsonLd } from "@/lib/structured-data";
import { pageMetadata } from "@/lib/metadata";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
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

  // Un `Group` ne vaut classement que si le format joue une phase de poule. Sur
  // un Premier Contender ce sont des brackets parallèles : en faire des étapes
  // de classement affichait « Bracket A » et « Bracket B » en deux tableaux
  // entièrement à zéro, devant l'arbre qu'ils désignent.
  const groupsAreStandings = STAGES_BY_FORMAT[tournament.format].includes("GROUP");

  // Étapes : chaque poule → son classement ; les playoffs → l'arbre du bracket.
  const stageDefs: { key: string; label: string; content: ReactNode }[] = [];
  if (groupsAreStandings) {
    for (const g of groups) {
      const rows = buildStandingRows(
        g.participants.map((p) => ({ teamId: p.teamId, name: p.team.name, tag: p.team.tag })),
        g.matches.map((m) => ({
          teamAId: m.teamAId,
          teamBId: m.teamBId,
          scoreA: m.scoreA,
          scoreB: m.scoreB,
        }))
      );
      stageDefs.push({ key: `g-${g.id}`, label: g.name, content: <StandingsTable rows={rows} /> });
    }
  }

  // Suisse, ligue et round robin se jouent en phase « poule » sans qu'aucune
  // poule ne soit créée : sans ce classement global, ces trois formats
  // affichaient leurs matchs mais aucun classement — leur raison d'être.
  // Couvre aussi une phase de poules dont l'organisateur n'a pas encore
  // découpé les groupes.
  //
  // Même garde que ci-dessus : la question n'est pas « le format peut-il porter
  // des groupes ? » (vrai pour le Premier Contender) mais « joue-t-il une phase
  // de poule ? ». Sans elle, un Contender affiche un classement vide.
  if (groups.length === 0 && groupsAreStandings) {
    const rows = buildStandingRows(
      tournament.participants.map((p) => ({
        teamId: p.teamId,
        name: p.team.name,
        tag: p.team.tag,
      })),
      allMatches
        .filter((m) => m.stage === "GROUP" && m.status === "FINISHED")
        .map((m) => ({
          teamAId: m.teamAId,
          teamBId: m.teamBId,
          scoreA: m.scoreA,
          scoreB: m.scoreB,
        }))
    );
    if (rows.length > 0) {
      stageDefs.push({
        key: "classement",
        label: "Classement",
        content: <StandingsTable rows={rows} />,
      });
    }
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
            forfeit: m.forfeit,
            status: m.status,
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
            teamA: m.teamA ? { tag: m.teamA.tag, logo: m.teamA.logo } : null,
            teamB: m.teamB ? { tag: m.teamB.tag, logo: m.teamB.logo } : null,
          }))}
        />
      ),
    });
  }

  // La carte de bracket n'est proposée que si l'arbre porte une rencontre.
  const shareVariants = tournamentShareVariants({
    id: tournament.id,
    name: tournament.name,
    bracketMatchCount: bracket.length,
  });

  const upcoming = allMatches.filter((m) => m.status === "SCHEDULED" || m.status === "LIVE");
  // Mêmes derniers résultats que sur les fiches équipe et joueur : les quatre
  // matchs terminés les plus récents, la liste complète restant dans l'onglet
  // Matches.
  const recent = allMatches
    .filter((m) => m.status === "FINISHED")
    .sort((a, b) => (b.date?.getTime() ?? -Infinity) - (a.date?.getTime() ?? -Infinity))
    .slice(0, 4);
  const miniMatch = (m: (typeof allMatches)[number], played: boolean) => ({
    id: m.id,
    date: m.date,
    hasTime: m.hasTime,
    teamA: m.teamA ? { tag: m.teamA.tag, logo: m.teamA.logo } : null,
    teamB: m.teamB ? { tag: m.teamB.tag, logo: m.teamB.logo } : null,
    scoreA: played ? m.scoreA : undefined,
    scoreB: played ? m.scoreB : undefined,
    forfeit: m.forfeit,
    status: m.status,
    bestOf: m.bestOf,
    maps: m.maps,
  });
  const stageLabel = (m: (typeof allMatches)[number]) =>
    m.group ? m.group.name : (m.round ?? "Playoffs");

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
      <MatchSideColumn
        upcoming={upcoming.map((m) => miniMatch(m, false))}
        recent={recent.map((m) => miniMatch(m, true))}
      />

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
              open={isRegistrationOpen(tournament)}
              teams={myTeams}
              teamCount={teamCount}
              maxTeams={tournament.maxTeams}
            />
          </div>
          {participants.length === 0 ? (
            <EmptyState
              title="Aucune équipe inscrite"
              description="Les équipes inscrites apparaîtront ici, avec leur effectif. L'inscription se fait depuis cette page tant qu'elle est ouverte."
              decor={<RosterDecor />}
            />
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

  // Du plus récent au plus ancien, comme l'index /matchs : l'onglet sert à
  // retrouver les derniers résultats, pas à relire le début du tournoi. La
  // requête reste triée en ascendant pour la gestion et « Matchs à venir » —
  // seuls les matchs sans date passent en queue plutôt qu'en tête.
  const matchesDesc = [...allMatches].sort(
    (a, b) => (b.date?.getTime() ?? -Infinity) - (a.date?.getTime() ?? -Infinity)
  );

  const matchesTab = (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
        Matches
      </h2>
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <TournamentMatchList
          matches={matchesDesc.map((m) => ({
            id: m.id,
            date: m.date,
            hasTime: m.hasTime,
            status: m.status,
            scoreA: m.scoreA,
            scoreB: m.scoreB,
            forfeit: m.forfeit,
            bestOf: m.bestOf,
            maps: m.maps,
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
    <EmptyState
      title="Aucune statistique pour l'instant"
      description="Les classements de joueurs, les moyennes et les records du tournoi se remplissent à mesure que les scoreboards des matchs sont importés."
      decor={<StatsDecor />}
    />
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
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-white">{tournament.name}</h1>
                <SocialLinks
                  socials={(tournament.socials ?? {}) as Record<string, string | undefined>}
                  size="h-4 w-4"
                />
              </div>
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
                <div className="text-xs font-semibold text-white">
                  {tournament.prizePool ?? "-"}
                </div>
                <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                  cash prize
                </div>
              </div>
              {shareVariants.length > 0 && (
                <ShareCardButton
                  variants={shareVariants}
                  pageUrl={`${SITE_URL}/tournois/${tournament.id}`}
                  title="Partager le tournoi"
                  alt={`Bracket de ${tournament.name}`}
                />
              )}
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
