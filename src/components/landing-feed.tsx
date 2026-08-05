import Link from "next/link";
import { signIn } from "@/lib/auth";
import { listRecentResults } from "@/lib/data/matches";
import { listTournaments } from "@/lib/data/tournaments";
import { listTopPlayers } from "@/lib/data/players";
import MatchRow from "@/components/match-row";
import TournamentCard from "@/components/tournament-card";
import PlayerMiniCard from "@/components/player-mini-card";
import LandingFeatures from "@/components/landing-features";

const H2 = "text-sm font-semibold uppercase tracking-wide text-[var(--accent)]";
/* La marge basse vit sur l'en-tête, pas sur le <h2> : dans un flex, une marge
   sur le titre seul décale le lien « Tout voir » vers le bas et le colle au
   contenu qui suit. */
const HEAD_ROW = "mb-3 flex items-baseline justify-between gap-4";
const SEE_ALL =
  "shrink-0 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]";
const BTN_PRIMARY =
  "rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90";

/**
 * Contenu vivant de l'accueil sous le hero : tournois, derniers résultats,
 * joueurs à suivre. Rendu conditionnel depuis `app/page.tsx`.
 */
export default async function LandingFeed({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [results, tournaments, topPlayers] = await Promise.all([
    listRecentResults(6),
    listTournaments(),
    listTopPlayers(6),
  ]);
  const liveOrUpcoming = tournaments.filter((t) => t.status !== "FINISHED").slice(0, 6);

  async function signInDiscord() {
    "use server";
    await signIn("discord");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      {liveOrUpcoming.length > 0 && (
        <section className="mb-12">
          <div className={HEAD_ROW}>
            <h2 className={H2}>Tournois en cours / à venir</h2>
            <Link href="/tournois" className={SEE_ALL}>
              Tout voir
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {liveOrUpcoming.map((t) => (
              <TournamentCard key={t.id} tournament={t} />
            ))}
          </div>
        </section>
      )}

      {results.length > 0 && (
        <section className="mb-12">
          <div className={HEAD_ROW}>
            <h2 className={H2}>Derniers résultats</h2>
            <Link href="/matchs" className={SEE_ALL}>
              Tout voir
            </Link>
          </div>
          <div className="grid gap-2">
            {results.map((m) => (
              <MatchRow
                key={m.id}
                match={{
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
                  contextLabel: m.tournament.name,
                }}
              />
            ))}
          </div>
        </section>
      )}

      {topPlayers.length > 0 && (
        <section className="mb-12">
          <h2 className={`${H2} mb-3`}>Joueurs à suivre</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {topPlayers.map((p) => (
              <PlayerMiniCard key={p.id} player={p} />
            ))}
          </div>
        </section>
      )}

      <section className="mb-12">
        <h2 className={`${H2} mb-3`}>Ta place dans le Hub</h2>
        <LandingFeatures />
      </section>

      <section
        className="rounded-lg border border-[var(--border)] px-6 py-14 text-center"
        style={{ background: "radial-gradient(120% 100% at 50% 100%, var(--accent-soft) 0%, var(--surface) 55%)" }}
      >
        <h2 className="text-2xl font-bold text-white">Prêt à jouer ?</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--text-muted)]">
          Rejoins la communauté T3 Valorant francophone.
        </p>
        <div className="mt-5">
          {isLoggedIn ? (
            <Link href="/tournois" className={`inline-block ${BTN_PRIMARY}`}>
              Explorer les tournois
            </Link>
          ) : (
            <form action={signInDiscord}>
              <button className={BTN_PRIMARY}>Rejoindre - Connexion Discord</button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
