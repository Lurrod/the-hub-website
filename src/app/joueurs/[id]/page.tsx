import Link from "next/link";
import SocialLinks from "@/components/social-links";
import Flag from "@/components/flag";
import TournamentTabs from "@/components/tournament-tabs";
import PlayerMatches from "@/components/player-matches";
import PlayerCareerTable from "@/components/player-career-table";
import { notFound } from "next/navigation";
import EmptyState, { StatsDecor } from "@/components/empty-state";
import FicheSansCompte from "@/components/fiche-sans-compte";
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
import { playerDiscordSocial } from "@/lib/discord";

import { playerSeo } from "@/lib/data/titles";
import JsonLdScript from "@/components/json-ld";
import ShareCardButton from "@/components/share-card-button";
import { playerJsonLd } from "@/lib/structured-data";
import { pageMetadata } from "@/lib/metadata";
import { playerShareVariants } from "@/lib/og/share-variants";
import { SITE_URL } from "@/lib/site";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const seo = await playerSeo(id);
  return pageMetadata({
    path: `/joueurs/${id}`,
    title: seo?.title ?? "Joueur",
    description: seo?.description,
  });
}

function computeAge(birthdate: Date | null): number | null {
  if (!birthdate) return null;
  const b = new Date(birthdate);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  if (
    now.getMonth() < b.getMonth() ||
    (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())
  ) {
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

  // Le Discord du compte lié complète les réseaux saisis à la main : c'est le
  // canal par lequel on recrute, il n'a pas à être ressaisi.
  const discord = playerDiscordSocial(player);
  const socials = {
    ...((player.socials ?? {}) as Record<string, string | undefined>),
    ...(discord ? { discord: discord.url } : {}),
  };
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
        {/* Sans une seule carte, les trois tuiles n'affichaient que des tirets
            et trois fois « Aucune carte jouée ». On les retire au profit d'un
            seul état vide, qui occupe la place que prendront les graphiques et
            annonce ce qui les fera apparaître. */}
        {!hasStats ? (
          <EmptyState
            title="Aucune statistique pour l'instant"
            description="Les moyennes, la courbe de rating et le détail par map apparaîtront dès qu'un match où ce joueur figure sera enregistré avec son scoreboard."
            action={{ label: "Voir les matchs enregistrés", href: "/matchs" }}
            decor={<StatsDecor />}
          />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatTile
                label="Agent le plus joué"
                value={overview.topAgent?.agent ?? "—"}
                sub={
                  overview.topAgent
                    ? `${overview.topAgent.maps} carte${overview.topAgent.maps > 1 ? "s" : ""} · ${overview.topAgent.pct} % du temps de jeu`
                    : "Agent non renseigné sur les cartes jouées"
                }
                icon={
                  overview.topAgent && <AgentIcon agent={overview.topAgent.agent} size="h-7 w-7" />
                }
              />
              <StatTile
                label="K/D"
                value={overview.kd.toFixed(2)}
                sub={`${overview.kills} kills · ${overview.deaths} morts`}
              />
              <StatTile
                label="Meilleure partie"
                value={overview.bestGame ? `${overview.bestGame.kills} kills` : "—"}
                sub={
                  overview.bestGame
                    ? `${overview.bestGame.mapName}${overview.bestGame.opponentTag ? ` vs ${overview.bestGame.opponentTag}` : ""} · ${overview.bestGame.kills}/${overview.bestGame.deaths}/${overview.bestGame.assists}`
                    : "Aucune partie relevée"
                }
                href={overview.bestGame ? `/matchs/${overview.bestGame.matchId}` : undefined}
              />
            </div>

            <section>
              <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
                Rating sur les {overview.trend.length} dernières cartes
              </h2>
              <p className="mb-4 text-xs text-[var(--text-muted)]">
                Moyenne sur la période : {overview.avgRating.toFixed(2)}
                <span className="dot-sep">·</span>
                <Link href="/rating" className="hover:text-[var(--accent)] hover:underline">
                  comment est-il calculé ?
                </Link>
              </p>
              <RatingTrend points={overview.trend} />
            </section>

            <section>
              <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
                Agents joués
              </h2>
              <p className="mb-4 text-xs text-[var(--text-muted)]">
                Part des cartes jouées. Chaque part porte le portrait de son agent et sa couleur
                officielle.
              </p>
              <AgentDonut agents={agentSlices} totalMaps={overview.maps} />
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
              <img
                src={player.photo}
                alt={player.pseudo}
                className="h-20 w-20 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="monogram grid h-20 w-20 shrink-0 place-items-center rounded-full text-xl">
                {player.pseudo.slice(0, 2).toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="n-24 font-bold text-white">{player.pseudo}</h1>
                <SocialLinks
                  socials={socials}
                  labels={discord ? { discord: discord.label } : undefined}
                />
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
                      <img
                        src={currentTeam.team.logo}
                        alt=""
                        className="h-4 w-4 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <span className="monogram grid h-4 w-4 shrink-0 place-items-center rounded text-[8px]">
                        {currentTeam.team.tag.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    {/* Taille posée en ligne : la contrainte typographique
                        globale de components.css n'est pas dans un `@layer` et
                        prime donc sur les utilitaires, y compris sur un
                        `text-sm` porté par le parent. Même échappatoire que le
                        pseudo juste au-dessus. */}
                    <span className="n-14 text-white">{currentTeam.team.name}</span>
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
                {age != null && <span className="n-14 stat">{age} ans</span>}
              </div>
            </div>

            <div className="sm:ml-auto">
              <ShareCardButton
                variants={playerShareVariants(player)}
                pageUrl={`${SITE_URL}/joueurs/${player.id}`}
                title="Partager la fiche"
                alt={`Carte du joueur ${player.pseudo}`}
              />
            </div>
          </div>
        }
        tabs={[
          { key: "apercu", label: "Aperçu", content: apercu },
          { key: "matches", label: "Matches", content: matchesTab },
          { key: "carriere", label: "Carrière", content: carriere },
        ]}
      />

      {/* `user` est nul quand aucun compte ne porte la fiche : elle vient alors
          d'un organisateur ou de l'import des matchs, sans que l'intéressé ait
          rien demandé. C'est cette population que l'article 14 du RGPD oblige à
          informer. */}
      {!player.user && <FicheSansCompte pseudo={player.pseudo} />}
    </main>
  );
}
