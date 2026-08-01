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

  const [matches, career] = await Promise.all([
    getPlayerMatches(player.id),
    getPlayerCareer(player.id),
  ]);

  const socials = (player.socials ?? {}) as Record<string, string | undefined>;
  const age = computeAge(player.birthdate);
  const roleIcon = roleIconUrl(player.valorantRole);
  const currentTeam = player.memberships.find((m) => m.leaveDate === null);

  // --- Onglet Aperçu (vide pour le moment) ---
  const apercu = (
    <div className="rounded-lg border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--text-muted)]">
      Bientôt disponible.
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
