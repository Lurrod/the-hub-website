import Link from "next/link";
import { auth, signIn } from "@/lib/auth";
import { listRecentResults } from "@/lib/data/matches";
import { listTournaments } from "@/lib/data/tournaments";
import { listTopPlayers, getPlayerByUserId } from "@/lib/data/players";
import MatchRow from "@/components/match-row";
import TournamentCard from "@/components/tournament-card";
import PlayerMiniCard from "@/components/player-mini-card";
import LandingFeatures from "@/components/landing-features";

const H2 = "mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--accent)]";
const BTN_PRIMARY =
  "rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90";

export default async function HomePage() {
  const session = await auth();
  const isLoggedIn = !!session?.user;
  const player = session?.user ? await getPlayerByUserId(session.user.id) : null;
  const profileHref = player ? `/joueurs/${player.id}` : "/profil";

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
    <main className="mx-auto max-w-6xl px-4 py-8">
      {/* Hero */}
      <section
        className="mb-12 rounded-lg border border-[var(--border)] px-6 py-16 text-center"
        style={{ background: "radial-gradient(120% 100% at 50% 0%, var(--accent-soft) 0%, var(--surface) 55%)" }}
      >
        <div className="eyebrow mb-2">T3 Valorant<span className="dot-sep">·</span>France</div>
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">The Hub</h1>
        <p className="mx-auto mt-3 max-w-xl text-[var(--text-muted)]">
          La maison du <span className="text-[var(--accent)]">Valorant Tier 3</span> francophone.
          Tournois, équipes et stats — au même endroit.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {isLoggedIn ? (
            <Link href={profileHref} className={BTN_PRIMARY}>
              Mon profil
            </Link>
          ) : (
            <form action={signInDiscord}>
              <button className={BTN_PRIMARY}>Connexion Discord</button>
            </form>
          )}
          <Link
            href="/tournois"
            className="rounded-lg border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            Explorer les tournois
          </Link>
        </div>
      </section>

      {/* Tournois en cours / à venir */}
      {liveOrUpcoming.length > 0 && (
        <section className="mb-12">
          <div className="flex items-end justify-between">
            <h2 className={H2}>Tournois en cours / à venir</h2>
            <Link href="/tournois" className="text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]">
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

      {/* Derniers résultats */}
      {results.length > 0 && (
        <section className="mb-12">
          <div className="flex items-end justify-between">
            <h2 className={H2}>Derniers résultats</h2>
            <Link href="/matchs" className="text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]">
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

      {/* Joueurs à suivre */}
      {topPlayers.length > 0 && (
        <section className="mb-12">
          <h2 className={H2}>Joueurs à suivre</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {topPlayers.map((p) => (
              <PlayerMiniCard key={p.id} player={p} />
            ))}
          </div>
        </section>
      )}

      {/* Rejoindre */}
      <section className="mb-12">
        <h2 className={H2}>Ta place dans le Hub</h2>
        <LandingFeatures />
      </section>

      {/* CTA finale */}
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
              <button className={BTN_PRIMARY}>Rejoindre — Connexion Discord</button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
