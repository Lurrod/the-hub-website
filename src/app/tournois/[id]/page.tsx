import Link from "next/link";
import { notFound } from "next/navigation";
import { getTournament, getTournamentTeamsWithPlayers } from "@/lib/data/tournaments";
import { listTournamentMatches, listGroups } from "@/lib/data/matches";
import TournamentTabs from "@/components/tournament-tabs";
import UpcomingMatchList from "@/components/upcoming-match-list";
import TournamentMatchList from "@/components/tournament-match-list";
import ParticipantCard from "@/components/participant-card";
import { getSessionUser, getTournamentManagerIds } from "@/lib/server-auth";
import { canManageTournament } from "@/lib/permissions";

export default async function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournament = await getTournament(id);
  if (!tournament) notFound();

  const sessionUser = await getSessionUser();
  const canManage = canManageTournament(sessionUser, await getTournamentManagerIds(id));

  const [participants, allMatches, groups] = await Promise.all([
    getTournamentTeamsWithPlayers(id),
    listTournamentMatches(id),
    listGroups(id),
  ]);

  // Étapes/stages : noms de poules + rounds de bracket (ou « Playoffs »).
  const bracketRounds = [
    ...new Set(
      allMatches
        .filter((m) => m.stage === "BRACKET")
        .map((m) => m.round)
        .filter((r): r is string => !!r)
    ),
  ];
  const hasBracket = allMatches.some((m) => m.stage === "BRACKET");
  const stages = [...groups.map((g) => g.name), ...bracketRounds];
  if (hasBracket && bracketRounds.length === 0) stages.push("Playoffs");

  const upcoming = allMatches.filter((m) => m.status === "SCHEDULED" || m.status === "LIVE");
  const stageLabel = (m: (typeof allMatches)[number]) =>
    m.group ? m.group.name : m.round ?? "Playoffs";

  const teamCount = tournament.participants.length;
  const fmt = (d: Date | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : null);
  const dateRange =
    [fmt(tournament.startDate), fmt(tournament.endDate)].filter(Boolean).join(" – ") ||
    "Dates à définir";

  const apercu = (
    <div>
      {/* Étapes en sous-menu */}
      {stages.length > 0 && (
        <div className="mb-6 flex gap-1 overflow-x-auto border-b border-[var(--border)]">
          {stages.map((s, i) => (
            <span
              key={s}
              className={`-mb-px shrink-0 border-b-2 px-4 py-2 text-sm font-medium ${
                i === 0
                  ? "border-[var(--accent)] text-white"
                  : "border-transparent text-[var(--text-muted)]"
              }`}
            >
              {s}
            </span>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
        <section className="self-start">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Matchs à venir
          </h2>
          <UpcomingMatchList
            matches={upcoming.map((m) => ({
              id: m.id,
              date: m.date,
              teamA: m.teamA ? { tag: m.teamA.tag, logo: m.teamA.logo } : null,
              teamB: m.teamB ? { tag: m.teamB.tag, logo: m.teamB.logo } : null,
            }))}
          />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Équipes participantes
          </h2>
          {participants.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">Aucune équipe inscrite.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {participants.map((p) => (
                <ParticipantCard
                  key={p.id}
                  p={{
                    teamId: p.teamId,
                    name: p.team.name,
                    logo: p.team.logo,
                    players: p.team.memberships.map((m) => m.player.pseudo),
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
    <TournamentMatchList
      matches={allMatches.map((m) => ({
        id: m.id,
        date: m.date,
        status: m.status,
        scoreA: m.scoreA,
        scoreB: m.scoreB,
        stageLabel: stageLabel(m),
        teamA: m.teamA ? { name: m.teamA.name } : null,
        teamB: m.teamB ? { name: m.teamB.name } : null,
      }))}
    />
  );

  const equipesTab = (
    <div className="rounded-lg border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--text-muted)]">
      En cours de développement.
    </div>
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
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
              <p className="mt-0.5 text-sm text-[var(--text-muted)]">{dateRange}</p>
            </div>

            <div className="flex items-center gap-8 sm:ml-auto">
              <div className="text-right">
                <div className="stat text-xl text-white">{teamCount}</div>
                <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                  équipes
                </div>
              </div>
              <div className="text-right">
                <div className="stat text-xl text-white">{tournament.prizePool ?? "—"}</div>
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
          { key: "equipes", label: "Équipes", content: equipesTab },
        ]}
      />
    </main>
  );
}
