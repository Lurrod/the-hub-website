import Link from "next/link";
import SocialLinks from "@/components/social-links";
import { notFound } from "next/navigation";
import { getTeam } from "@/lib/data/teams";
import { getTeamRosterCards, getTeamAlumni } from "@/lib/data/players";
import {
  getTeamMatchesByTournament,
  listTeamUpcomingMatches,
  listTeamRecentMatches,
} from "@/lib/data/matches";
import { getTeamTournaments } from "@/lib/data/tournaments";
import { getSessionUser, getTeamManagerIds } from "@/lib/server-auth";
import { canManageTeam } from "@/lib/permissions";
import TeamMatchGroups from "@/components/team-match-groups";
import TournamentTabs from "@/components/tournament-tabs";
import TournamentCard from "@/components/tournament-card";
import MatchSideColumn from "@/components/match-side-column";
import TeamPlayerCard from "@/components/team-player-card";

import { teamTitle } from "@/lib/data/titles";
import JsonLdScript from "@/components/json-ld";
import { teamJsonLd } from "@/lib/structured-data";
import { pageMetadata } from "@/lib/metadata";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const name = await teamTitle(id);
  return pageMetadata({ path: `/equipes/${id}`, title: name ?? "Équipe" });
}

const ROLE_LABELS: Record<string, string> = {
  JOUEUR: "Joueur",
  SUB: "Remplaçant",
  COACH: "Coach",
  MANAGER: "Manager",
};

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const team = await getTeam(id);
  if (!team) notFound();

  const sessionUser = await getSessionUser();
  const canManage = canManageTeam(sessionUser, await getTeamManagerIds(team.id));

  const [roster, matchGroups, alumni, tournaments, upcoming, recent] = await Promise.all([
    getTeamRosterCards(team.id),
    getTeamMatchesByTournament(team.id),
    getTeamAlumni(team.id),
    getTeamTournaments(team.id),
    listTeamUpcomingMatches(team.id),
    listTeamRecentMatches(team.id),
  ]);
  // Le staff (coachs, managers) a sa propre zone : ses cartes n'ont ni rôle
  // Valorant ni agents, elles n'ont rien à faire au milieu des joueurs.
  const STAFF_ROLES = new Set(["COACH", "MANAGER"]);
  const players = roster.filter((m) => !STAFF_ROLES.has(m.role));
  const staff = roster.filter((m) => STAFF_ROLES.has(m.role));
  const playerCard = (m: (typeof roster)[number]) => (
    <TeamPlayerCard
      key={m.membershipId}
      player={{
        id: m.player.id,
        pseudo: m.player.pseudo,
        photo: m.player.photo,
        nationality: m.player.nationality,
        valorantRole: m.player.valorantRole,
        birthdate: m.player.birthdate,
        membershipRole: m.role,
        joinDate: m.joinDate,
        topAgents: m.topAgents,
      }}
    />
  );
  const miniMatch = (m: (typeof upcoming)[number], played: boolean) => ({
    id: m.id,
    date: m.date,
    hasTime: m.hasTime,
    teamA: { tag: m.teamA.tag, logo: m.teamA.logo },
    teamB: { tag: m.teamB.tag, logo: m.teamB.logo },
    scoreA: played ? m.scoreA : undefined,
    scoreB: played ? m.scoreB : undefined,
  });
  const fmtDate = (d: Date | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "…");

  const socials = (team.socials ?? {}) as Record<string, string | undefined>;

  // Onglet Aperçu : matchs de l'équipe en colonne (comme l'aperçu d'un tournoi),
  // cartes joueurs sur le reste de la largeur, anciens joueurs en dessous.
  const apercu = (
    <div className="flex flex-col gap-8">
      {team.description && (
        <p className="whitespace-pre-line text-[var(--text)]">{team.description}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
        <MatchSideColumn
          upcoming={upcoming.map((m) => miniMatch(m, false))}
          recent={recent.map((m) => miniMatch(m, true))}
        />

        <div className="flex flex-col gap-8">
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
              Roster
            </h2>
            {players.length === 0 ? (
              <p className="text-[var(--text-muted)]">Aucun joueur enregistré pour cette équipe.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {players.map(playerCard)}
              </div>
            )}
          </section>

          {staff.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
                Staff
              </h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {staff.map(playerCard)}
              </div>
            </section>
          )}
        </div>
      </div>

      {alumni.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-bold tracking-tight text-white">Anciens joueurs</h2>
          <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-lg border border-[var(--border)]">
            {alumni.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between p-3 text-sm transition-colors hover:bg-[var(--table-row-hover)]"
              >
                <Link
                  href={`/joueurs/${m.playerId}`}
                  className="text-white hover:text-[var(--accent)]"
                >
                  {m.player.pseudo}
                </Link>
                <span className="text-[var(--text-muted)]">
                  {ROLE_LABELS[m.role] ?? m.role}
                  <span className="dot-sep">·</span>
                  <span className="stat">
                    {fmtDate(m.joinDate)} → {fmtDate(m.leaveDate)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );

  // Onglet Matchs : matchs joués, rangés par tournoi dans des zones repliables.
  const matchesTab = (
    <TeamMatchGroups
      teamId={team.id}
      groups={matchGroups.map((g) => ({
        tournamentId: g.tournament.id,
        tournamentName: g.tournament.name,
        tournamentLogo: g.tournament.logo,
        matches: g.matches.map((m) => ({
          id: m.id,
          teamAId: m.teamAId,
          teamBId: m.teamBId,
          scoreA: m.scoreA,
          scoreB: m.scoreB,
          winnerId: m.winnerId,
          status: m.status,
          date: m.date,
          hasTime: m.hasTime,
          bestOf: m.bestOf,
          vodUrl: m.vodUrl,
          teamA: m.teamA ? { name: m.teamA.name, tag: m.teamA.tag, logo: m.teamA.logo } : null,
          teamB: m.teamB ? { name: m.teamB.name, tag: m.teamB.tag, logo: m.teamB.logo } : null,
        })),
      }))}
    />
  );

  // Onglet Tournois : compétitions où l'équipe est inscrite.
  const tournoisTab =
    tournaments.length > 0 ? (
      <div className="grid gap-4 sm:grid-cols-2">
        {tournaments.map((t) => (
          <TournamentCard key={t.id} tournament={t} />
        ))}
      </div>
    ) : (
      <p className="text-[var(--text-muted)]">Cette équipe n&apos;est inscrite à aucun tournoi.</p>
    );

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <JsonLdScript data={teamJsonLd(team)} />
      <TournamentTabs
        header={
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
            {team.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={team.logo} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
            ) : (
              <div className="monogram grid h-20 w-20 shrink-0 place-items-center rounded-lg text-xl">
                {team.tag.slice(0, 3).toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <h1 className="t-title font-bold text-white">{team.name}</h1>
              <SocialLinks socials={socials} size="h-4 w-4" className="mt-2" />
            </div>

            {canManage && (
              <Link
                href={`/equipes/${team.id}/gestion`}
                className="rounded bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white sm:ml-auto"
              >
                Gérer l&apos;équipe
              </Link>
            )}
          </div>
        }
        tabs={[
          { key: "apercu", label: "Aperçu", content: apercu },
          { key: "matchs", label: "Matchs", content: matchesTab },
          { key: "tournois", label: "Tournois", content: tournoisTab },
        ]}
      />
    </main>
  );
}
