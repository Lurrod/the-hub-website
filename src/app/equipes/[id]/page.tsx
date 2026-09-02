import Link from "next/link";
import SocialLinks from "@/components/social-links";
import EmptyState, { RosterDecor } from "@/components/empty-state";
import FormeFrieze from "@/components/charts/forme-frieze";
import { construireForme } from "@/lib/forme-recente-core";
import { notFound } from "next/navigation";
import { getTeam } from "@/lib/data/teams";
import { getTeamRosterCards, getTeamAlumni } from "@/lib/data/players";
import {
  getTeamMatchesByTournament,
  listTeamUpcomingMatches,
  listTeamRecentMatches,
} from "@/lib/data/matches";
import { getTeamTournaments } from "@/lib/data/tournaments";
import type { MatchForfeit } from "@/lib/constants";
import { getSessionUser, getTeamManagerIds } from "@/lib/server-auth";
import { canManageTeam } from "@/lib/permissions";
import TeamMatchGroups from "@/components/team-match-groups";
import TournamentTabs from "@/components/tournament-tabs";
import TournamentCard from "@/components/tournament-card";
import MatchSideColumn from "@/components/match-side-column";
import TeamPlayerCard from "@/components/team-player-card";

import { teamSeo } from "@/lib/data/titles";
import JsonLdScript from "@/components/json-ld";
import { teamJsonLd } from "@/lib/structured-data";
import { pageMetadata } from "@/lib/metadata";
import { fullDate } from "@/lib/dates";
import { fichePath, idFromSegment } from "@/lib/slug";
import { ficheName } from "@/lib/data/existence";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id: segment } = await params;
  const id = idFromSegment(segment);
  const seo = await teamSeo(id);
  return pageMetadata({
    // Le canonique doit être la forme vers laquelle le proxy redirige, au
    // caractère près : les deux passent donc par `ficheName`. Reprendre
    // `seo.title` aurait suffi pour trois sections sur quatre — mais
    // `matchSeo` rend « TAG vs TAG », et chaque fiche de match aurait
    // rebouclé indéfiniment.
    path: fichePath("equipes", id, await ficheName("equipes", id)),
    title: seo?.title ?? "Équipe",
    description: seo?.description,
  });
}

const ROLE_LABELS: Record<string, string> = {
  JOUEUR: "Joueur",
  SUB: "Remplaçant",
  COACH: "Coach",
  MANAGER: "Manager",
};

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: segment } = await params;
  const id = idFromSegment(segment);
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

  // La frise repart des mêmes matchs que le bandeau latéral : une seconde
  // requête donnerait deux vérités possibles sur la même page.
  const forme = construireForme(recent, team.id);
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
  // Forme minimale requise par `MiniMatch` : `upcoming` et `recent` viennent
  // de deux requêtes aux `select` désormais différents (la seconde ne charge
  // plus l'équipe en entier), donc un type calé sur l'une des deux ne
  // conviendrait plus à l'autre.
  type MiniMatchSource = {
    id: string;
    date: Date | null;
    hasTime: boolean;
    teamA: { tag: string; logo: string | null };
    teamB: { tag: string; logo: string | null };
    scoreA: number;
    scoreB: number;
    forfeit: MatchForfeit;
    status: string;
    bestOf: number;
    maps: { scoreA: number; scoreB: number }[];
  };
  const miniMatch = (m: MiniMatchSource, played: boolean) => ({
    id: m.id,
    date: m.date,
    hasTime: m.hasTime,
    teamA: { tag: m.teamA.tag, logo: m.teamA.logo },
    teamB: { tag: m.teamB.tag, logo: m.teamB.logo },
    scoreA: played ? m.scoreA : undefined,
    scoreB: played ? m.scoreB : undefined,
    forfeit: m.forfeit,
    status: m.status,
    bestOf: m.bestOf,
    maps: m.maps,
  });
  const fmtDate = (d: Date | null) => (d ? fullDate(d) : "…");

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
              <EmptyState
                title="Aucun joueur enregistré"
                description="L'effectif se remplit quand un manager invite ses joueurs. Leurs statistiques de match remontent ensuite d'elles-mêmes sur la fiche."
                decor={<RosterDecor />}
              />
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

          {/* Sous l'effectif, pas au-dessus : on vient d'abord voir qui compose
              l'équipe. La frise dit ensuite ce que le bandeau de gauche ne peut
              pas montrer — l'ampleur de chaque résultat, et la dynamique. */}
          {forme.matchs.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
                Forme récente
              </h2>
              <FormeFrieze forme={forme} teamName={team.name} />
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
          forfeit: m.forfeit,
          date: m.date,
          hasTime: m.hasTime,
          bestOf: m.bestOf,
          maps: m.maps,
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
              <img
                src={team.logo}
                alt={`Logo ${team.name}`}
                className="h-20 w-20 shrink-0 rounded-lg object-cover"
              />
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
                className="rounded bg-[var(--accent)] px-3 py-1.5 text-sm font-medium sm:ml-auto"
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
