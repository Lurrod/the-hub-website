import Link from "next/link";
import SocialLinks from "@/components/social-links";
import Flag from "@/components/flag";
import TournamentTabs from "@/components/tournament-tabs";
import PlayerMatches from "@/components/player-matches";
import PlayerCareerTable from "@/components/player-career-table";
import { notFound } from "next/navigation";
import { getPlayer } from "@/lib/data/players";
import { getPlayerMatches } from "@/lib/data/player-matches";
import { getPlayerCareer } from "@/lib/data/player-career";
import { getPlayerOverview } from "@/lib/data/player-overview";
import { listPlayerUpcomingMatches, listPlayerRecentMatches } from "@/lib/data/matches";
import MatchSideColumn from "@/components/match-side-column";
import AgentDonut from "@/components/charts/agent-donut";
import AgentIcon from "@/components/agent-icon";
import StatTile from "@/components/charts/stat-tile";
import BarList from "@/components/charts/bar-list";
import Meter from "@/components/charts/meter";
import RatingTrend from "@/components/charts/rating-trend";
import { roleIconUrl, roleLabel } from "@/lib/roles";

import { playerTitle } from "@/lib/data/titles";
import JsonLdScript from "@/components/json-ld";
import { playerJsonLd } from "@/lib/structured-data";
import { pageMetadata } from "@/lib/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const name = await playerTitle(id);
  return pageMetadata({ path: `/joueurs/${id}`, title: name ?? "Joueur" });
}

function computeAge(birthdate: Date | null): number | null {
  if (!birthdate) return null;
  const b = new Date(birthdate);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) {
    age -= 1;
  }
  return age;
}

export default async function PlayerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = await getPlayer(id);
  if (!player) notFound();

  // La colonne de matchs est individuelle : les résultats sont ceux que le
  // joueur a joués, pas ceux de son équipe. Sans ça, un joueur sans équipe
  // actuelle affichait « aucun match » alors qu'il en avait à son actif.
  const [matches, career, overview, upcoming, recent] = await Promise.all([
    getPlayerMatches(player.id),
    getPlayerCareer(player.id),
    getPlayerOverview(player.id),
    listPlayerUpcomingMatches(player.id),
    listPlayerRecentMatches(player.id),
  ]);
  const miniMatch = (m: (typeof upcoming)[number], played: boolean) => ({
    id: m.id,
    date: m.date,
    teamA: { tag: m.teamA.tag, logo: m.teamA.logo },
    teamB: { tag: m.teamB.tag, logo: m.teamB.logo },
    scoreA: played ? m.scoreA : undefined,
    scoreB: played ? m.scoreB : undefined,
  });

  const socials = (player.socials ?? {}) as Record<string, string | undefined>;
  const age = computeAge(player.birthdate);
  const roleIcon = roleIconUrl(player.valorantRole);
  const currentTeam = player.memberships.find((m) => m.leaveDate === null);

  // --- Onglet Aperçu ---
  // Matchs du joueur à gauche, chiffres clés à droite, puis les lectures
  // visuelles en dessous.
  const entryDuels = overview.firstKills + overview.firstDeaths;
  const agentSlices = overview.agentsOther
    ? [...overview.agents, overview.agentsOther]
    : overview.agents;
  const hasStats = overview.maps > 0;

  const apercu = (
    // La colonne de gauche est réservée aux matchs : tout le reste, tuiles comme
    // graphiques, vit dans la colonne de droite, sous les trois chiffres clés.
    <div className="grid gap-6 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
      <MatchSideColumn
        upcoming={upcoming.map((m) => miniMatch(m, false))}
        recent={recent.map((m) => miniMatch(m, true))}
      />

      <div className="flex min-w-0 flex-col gap-10">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile
            label="Agent le plus joué"
            value={overview.topAgent?.agent ?? "-"}
            sub={
              overview.topAgent
                ? `${overview.topAgent.maps} carte${overview.topAgent.maps > 1 ? "s" : ""} · ${overview.topAgent.pct} % du temps de jeu`
                : "Aucune carte jouée"
            }
            icon={overview.topAgent && <AgentIcon agent={overview.topAgent.agent} size="h-7 w-7" />}
          />
          <StatTile
            label="K/D"
            value={hasStats ? overview.kd.toFixed(2) : "-"}
            sub={hasStats ? `${overview.kills} kills · ${overview.deaths} morts` : "Aucune carte jouée"}
          />
          <StatTile
            label="Meilleure partie"
            value={overview.bestGame ? `${overview.bestGame.kills} kills` : "-"}
            sub={
              overview.bestGame
                ? `${overview.bestGame.mapName}${overview.bestGame.opponentTag ? ` vs ${overview.bestGame.opponentTag}` : ""} · ${overview.bestGame.kills}/${overview.bestGame.deaths}/${overview.bestGame.assists}`
                : "Aucune carte jouée"
            }
            href={overview.bestGame ? `/matchs/${overview.bestGame.matchId}` : undefined}
          />
        </div>

        {!hasStats ? (
          <p className="rounded-lg border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--text-muted)]">
            Aucune statistique pour l&apos;instant. Les graphiques apparaîtront dès la
            première carte jouée avec un scoreboard importé.
          </p>
        ) : (
          <>
            <section>
              <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
                Rating sur les {overview.trend.length} dernières cartes
              </h2>
              <p className="mb-4 text-xs text-[var(--text-muted)]">
                Moyenne sur la période : {overview.avgRating.toFixed(2)}
              </p>
              <RatingTrend points={overview.trend} />
            </section>

            <section>
              <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
                Agents joués
              </h2>
              <p className="mb-4 text-xs text-[var(--text-muted)]">
                Part des cartes jouées. Chaque part porte le portrait de son agent et sa
                couleur officielle.
              </p>
              <AgentDonut
                agents={agentSlices}
                totalMaps={overview.maps}
              />
            </section>

            <section>
              <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
                Winrate par map
              </h2>
              <p className="mb-4 text-xs text-[var(--text-muted)]">
                Le repère en pointillé marque 50 %.
              </p>
              <BarList
                max={100}
                reference={50}
                referenceLabel="50 %"
                items={overview.mapRecords.map((m) => ({
                  key: m.mapName,
                  label: m.mapName,
                  value: m.winratePct,
                  valueLabel: `${m.winratePct} %`,
                  note: `${m.wins}/${m.maps}`,
                  title: `${m.mapName} — ${m.wins} victoire(s) sur ${m.maps} carte(s)`,
                }))}
              />
            </section>

            <section>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
                Profil de performance
              </h2>
              <div className="grid gap-3 sm:grid-cols-3">
                <Meter
                  label="KAST"
                  value={overview.avgKast}
                  valueLabel={`${overview.avgKast} %`}
                  sub="Rounds où il tue, assiste, survit ou est trade."
                />
                <Meter
                  label="Tirs à la tête"
                  value={overview.avgHs}
                  valueLabel={`${overview.avgHs} %`}
                  sub={`ACS moyen ${overview.avgAcs}.`}
                />
                <Meter
                  label="Duels d'entry gagnés"
                  value={entryDuels > 0 ? (overview.firstKills / entryDuels) * 100 : 0}
                  valueLabel={
                    entryDuels > 0
                      ? `${Math.round((overview.firstKills / entryDuels) * 100)} %`
                      : "-"
                  }
                  sub={`${overview.firstKills} first kills · ${overview.firstDeaths} first deaths.`}
                />
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );

  // --- Onglet Matches ---
  const matchesTab = <PlayerMatches days={matches} />;

  // --- Onglet Carrière (tableau des équipes) ---
  const carriere = <PlayerCareerTable stints={career} />;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <JsonLdScript data={playerJsonLd(player)} />
      <TournamentTabs
        header={
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
            {player.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={player.photo} alt="" className="h-20 w-20 shrink-0 rounded-full object-cover" />
            ) : (
              <div className="monogram grid h-20 w-20 shrink-0 place-items-center rounded-full text-xl">
                {player.pseudo.slice(0, 2).toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 style={{ fontSize: "24px" }} className="font-bold text-white">
                  {player.pseudo}
                </h1>
                <SocialLinks socials={socials} />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[var(--text-muted)]">
                {player.nationality && <Flag country={player.nationality} className="h-3 w-4" />}
                {currentTeam && (
                  <Link
                    href={`/equipes/${currentTeam.teamId}`}
                    className="flex items-center gap-1.5 hover:text-[var(--accent)]"
                  >
                    {currentTeam.team.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={currentTeam.team.logo} alt="" className="h-4 w-4 shrink-0 rounded object-cover" />
                    ) : (
                      <span className="monogram grid h-4 w-4 shrink-0 place-items-center rounded text-[8px]">
                        {currentTeam.team.tag.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <span className="text-white">{currentTeam.team.name}</span>
                  </Link>
                )}
                {roleIcon && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={roleIcon}
                    alt={roleLabel(player.valorantRole) ?? ""}
                    title={roleLabel(player.valorantRole) ?? ""}
                    className="h-4 w-4 shrink-0"
                  />
                )}
                {age != null && <span className="stat">{age} ans</span>}
              </div>
            </div>
          </div>
        }
        tabs={[
          { key: "apercu", label: "Aperçu", content: apercu },
          { key: "matches", label: "Matches", content: matchesTab },
          { key: "carriere", label: "Carrière", content: carriere },
        ]}
      />
    </main>
  );
}
