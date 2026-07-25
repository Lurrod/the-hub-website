import Link from "next/link";
import { auth, signIn } from "@/lib/auth";
import { getTeamByInviteToken } from "@/lib/data/teams";
import { getPlayerByUserId, getActiveMembership } from "@/lib/data/players";
import { isInviteValid, isInviteTokenFormat } from "@/lib/invite";
import { joinTeamViaInviteAction } from "@/app/rejoindre/actions";

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-md px-4 py-16 text-center">{children}</main>;
}

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  // Rejette les tokens mal formés avant tout accès DB (et avant de les réutiliser en redirectTo).
  const team = isInviteTokenFormat(token) ? await getTeamByInviteToken(token) : null;

  if (!isInviteValid(team, new Date())) {
    return (
      <Shell>
        <h1 className="mb-3 text-2xl font-bold text-white">Lien invalide ou expiré</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Ce lien d&apos;invitation n&apos;est plus valable. Demande un nouveau lien au manager de
          l&apos;équipe.
        </p>
      </Shell>
    );
  }

  const session = await auth();

  // Non connecté → créer un compte / se connecter avec Discord.
  if (!session?.user) {
    return (
      <Shell>
        <h1 className="mb-2 text-2xl font-bold text-white">Rejoindre {team.name}</h1>
        <p className="mb-6 text-sm text-[var(--text-muted)]">
          Connecte-toi avec Discord pour rejoindre cette équipe. Un compte sera créé si tu
          n&apos;en as pas.
        </p>
        <form
          action={async () => {
            "use server";
            await signIn("discord", { redirectTo: `/rejoindre/${token}` });
          }}
        >
          <button className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white">
            Se connecter avec Discord
          </button>
        </form>
      </Shell>
    );
  }

  // Connecté : lire la fiche joueur SANS la créer (la création se fait au join).
  const player = await getPlayerByUserId(session.user.id);
  const active = player ? await getActiveMembership(player.id) : null;

  if (active && active.teamId === team.id) {
    return (
      <Shell>
        <h1 className="mb-3 text-2xl font-bold text-white">Tu es déjà dans {team.name}</h1>
        <Link
          href={`/equipes/${team.id}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm text-white transition-colors duration-[130ms] hover:border-[var(--accent)] hover:bg-[var(--card-hover)] hover:text-[var(--accent)]"
        >
          Voir l&apos;équipe →
        </Link>
      </Shell>
    );
  }

  if (active) {
    return (
      <Shell>
        <h1 className="mb-3 text-2xl font-bold text-white">Tu dois d&apos;abord quitter ton équipe</h1>
        <p className="mb-6 text-sm text-[var(--text-muted)]">
          Tu fais déjà partie de <span className="text-white">{active.team.name}</span>. Quitte-la
          depuis ton profil avant de rejoindre {team.name}.
        </p>
        <Link
          href="/profil"
          className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
        >
          Aller à mon profil
        </Link>
      </Shell>
    );
  }

  // Sans équipe → rejoindre.
  const joinWithToken = joinTeamViaInviteAction.bind(null, token);
  return (
    <Shell>
      <h1 className="mb-2 text-2xl font-bold text-white">Rejoindre {team.name}</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        Tu vas rejoindre le roster de <span className="text-white">{team.name}</span> en tant que
        joueur.
      </p>
      <form action={joinWithToken}>
        <button className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white">
          Rejoindre l&apos;équipe
        </button>
      </form>
    </Shell>
  );
}
