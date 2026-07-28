import Link from "next/link";
import SocialLinks from "@/components/social-links";
import { notFound } from "next/navigation";
import { getTeam } from "@/lib/data/teams";
import { getTeamRoster, getTeamAlumni } from "@/lib/data/players";
import { getTeamMatchesByTournament } from "@/lib/data/matches";
import { getTeamTournaments } from "@/lib/data/tournaments";
import { getSessionUser, getTeamManagerIds } from "@/lib/server-auth";
import { canManageTeam } from "@/lib/permissions";
import TeamMatchGroups from "@/components/team-match-groups";
import TournamentTabs from "@/components/tournament-tabs";
import TournamentCard from "@/components/tournament-card";
import Flag from "@/components/flag";

import { teamTitle } from "@/lib/data/titles";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const name = await teamTitle(id);
  return { title: name ?? "Équipe" };
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

  const [roster, matchGroups, alumni, tournaments] = await Promise.all([
    getTeamRoster(team.id),
    getTeamMatchesByTournament(team.id),
    getTeamAlumni(team.id),
    getTeamTournaments(team.id),
  ]);
  const fmtDate = (d: Date | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "…");

  const socials = (team.socials ?? {}) as Record<string, string | undefined>;

  // Onglet Aperçu : identité, réseaux, effectif, anciens joueurs.
  const apercu = (
    <div className="flex flex-col gap-10">
      {team.description && (
        <p className="whitespace-pre-line text-[var(--text)]">{team.description}</p>
      )}

      <SocialLinks socials={socials} />

      <section>
        <h2 className="mb-4 text-[16px] font-bold tracking-tight text-[var(--accent)]">Roster</h2>
        {roster.length === 0 ? (
          <p className="text-[var(--text-muted)]">Aucun joueur enregistré pour cette équipe.</p>
        ) : (
          /* Roster sur une seule ligne : les tuiles se partagent la largeur, avec
             une taille plancher qui fait défiler la rangée sur petit écran. */
          <ul className="flex gap-2 overflow-x-auto pb-1">
            {roster.map((m) => (
              <li key={m.id} className="min-w-[100px] flex-1">
                <Link
                  href={`/joueurs/${m.playerId}`}
                  className="card card-interactive flex h-full flex-col items-center gap-2 p-3 text-center"
                >
                  {m.player.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.player.photo} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="monogram grid h-14 w-14 shrink-0 place-items-center rounded-lg text-sm">
                      {m.player.pseudo.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  {/* flex-1 + mt-auto : le rôle reste aligné en bas d'une tuile à
                      l'autre, même quand un joueur a un nom réel et pas les autres. */}
                  <div className="flex w-full min-w-0 flex-1 flex-col">
                    <div className="flex items-center justify-center gap-1.5">
                      {m.player.nationality && <Flag country={m.player.nationality} />}
                      <span className="truncate font-semibold text-white">{m.player.pseudo}</span>
                    </div>
                    {m.player.realName && (
                      <div className="truncate text-xs text-[var(--text-muted)]">{m.player.realName}</div>
                    )}
                    <div className="mt-auto pt-0.5 text-[10px] uppercase tracking-wide text-[var(--text-subtle)]">
                      {ROLE_LABELS[m.role] ?? m.role}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {alumni.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-bold tracking-tight text-white">Anciens joueurs</h2>
          <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-lg border border-[var(--border)]">
            {alumni.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between p-3 text-sm transition-colors hover:bg-[var(--table-row-hover)]"
              >
                <Link href={`/joueurs/${m.playerId}`} className="text-white hover:text-[var(--accent)]">
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
    <main className="mx-auto max-w-4xl px-4 py-10">
      <TournamentTabs
        header={
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
            {team.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={team.logo} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
            ) : (
              <div className="monogram grid h-16 w-16 shrink-0 place-items-center rounded-lg text-lg">
                {team.tag.slice(0, 3).toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-white">{team.name}</h1>
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
