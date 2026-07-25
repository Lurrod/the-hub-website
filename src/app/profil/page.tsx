import Link from "next/link";
import { auth, signIn } from "@/lib/auth";
import { ensurePlayerForUser, getActiveMembership } from "@/lib/data/players";
import { updateMyProfileAction, leaveMyTeamAction } from "@/app/profil/actions";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="mb-4 text-2xl font-bold text-white">Ton profil</h1>
        <p className="mb-6 text-sm text-[var(--text-muted)]">
          Connecte-toi avec Discord pour accéder à ton profil joueur.
        </p>
        <form
          action={async () => {
            "use server";
            await signIn("discord", { redirectTo: "/profil" });
          }}
        >
          <button className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white">
            Connexion Discord
          </button>
        </form>
      </main>
    );
  }

  const player = await ensurePlayerForUser(session.user.id, {
    pseudo: session.user.name,
    photo: session.user.image,
  });
  const membership = await getActiveMembership(player.id);
  const socials = (player.socials ?? {}) as { twitter?: string; twitch?: string };
  const input =
    "rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-white";

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Mon profil</h1>
        <Link
          href={`/joueurs/${player.id}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm text-white transition-colors duration-[130ms] hover:border-[var(--accent)] hover:bg-[var(--card-hover)] hover:text-[var(--accent)]"
        >
          Voir ma fiche publique →
        </Link>
      </div>

      <section className="mb-8 rounded-lg border border-[var(--border)] p-4">
        <h2 className="mb-2 text-lg font-semibold text-white">Mon équipe</h2>
        {membership ? (
          <div className="flex items-center gap-3">
            <Link href={`/equipes/${membership.teamId}`} className="font-medium text-white hover:text-[var(--accent)]">
              {membership.team.name}
            </Link>
            <form action={leaveMyTeamAction} className="ml-auto">
              <button className="rounded bg-[var(--card)] px-3 py-1.5 text-xs text-[var(--accent)]">
                Quitter l'équipe
              </button>
            </form>
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">
            Tu n'es dans aucune équipe. Utilise un lien d'invitation pour en rejoindre une.
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-white">Informations</h2>
        <form action={updateMyProfileAction} className="grid gap-3">
          <label className="grid gap-1 text-sm text-[var(--text-muted)]">
            Pseudo
            <input name="pseudo" defaultValue={player.pseudo} required maxLength={40} className={input} />
          </label>
          <label className="grid gap-1 text-sm text-[var(--text-muted)]">
            Nationalité
            <input name="nationality" defaultValue={player.nationality ?? ""} maxLength={40} className={input} />
          </label>
          <label className="grid gap-1 text-sm text-[var(--text-muted)]">
            Twitter (URL)
            <input name="twitter" type="url" defaultValue={socials.twitter ?? ""} className={input} />
          </label>
          <label className="grid gap-1 text-sm text-[var(--text-muted)]">
            Twitch (URL)
            <input name="twitch" type="url" defaultValue={socials.twitch ?? ""} className={input} />
          </label>
          <label className="grid gap-1 text-sm text-[var(--text-muted)]">
            Photo
            <input name="photo" type="file" accept="image/png,image/jpeg,image/webp" className={input} />
          </label>
          <button className="mt-1 rounded bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white">
            Enregistrer
          </button>
        </form>
      </section>
    </main>
  );
}
