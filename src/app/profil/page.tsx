import Link from "next/link";
import { auth, signIn } from "@/lib/auth";
import { ensurePlayerForUser, getActiveMembership } from "@/lib/data/players";
import {
  updateMyProfileAction,
  updateMyRiotIdAction,
  leaveMyTeamAction,
} from "@/app/profil/actions";
import CountrySelect from "@/components/country-select";
import RiotIdForm from "@/components/riot-id-form";
import ImageUpload from "@/components/image-upload";
import { VALORANT_ROLES, ROLE_LABELS } from "@/lib/roles";

export const metadata = { title: "Mon profil" };

const input =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[var(--accent)]";
const lbl = "grid gap-1 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
          Ton profil
        </h1>
        <p className="mb-6 mt-2 text-sm text-[var(--text-muted)]">
          Connecte-toi avec Discord pour accéder à ton profil joueur.
        </p>
        <form
          action={async () => {
            "use server";
            await signIn("discord", { redirectTo: "/profil" });
          }}
        >
          <button className="rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90">
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
  const nationality = player.nationality ?? "";
  const birthdateValue = player.birthdate
    ? new Date(player.birthdate).toISOString().slice(0, 10)
    : "";
  const currentRiotId = player.riotName ? `${player.riotName}#${player.riotTag}` : "";

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
            Paramètres
          </h1>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Gère ton profil joueur et ton équipe.
          </p>
        </div>
        <Link
          href={`/joueurs/${player.id}`}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm text-white transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          Voir ma fiche publique
        </Link>
      </div>

      <div className="grid gap-6">
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
            Mon équipe
          </h2>
          {membership ? (
            <div className="flex items-center gap-3">
              <Link
                href={`/equipes/${membership.teamId}`}
                className="font-medium text-white hover:text-[var(--accent)]"
              >
                {membership.team.name}
              </Link>
              <form action={leaveMyTeamAction} className="ml-auto">
                <button className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--accent)] transition-colors hover:border-[var(--accent)]">
                  Quitter l&apos;équipe
                </button>
              </form>
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">
              Tu n&apos;es dans aucune équipe. Utilise un lien d&apos;invitation pour en rejoindre une.
            </p>
          )}
        </section>

        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
            Compte Valorant
          </h2>
          <p className="mb-4 text-xs text-[var(--text-muted)]">
            Ton Riot ID sert à relier tes matchs et statistiques. On vérifie qu&apos;il existe
            auprès de Riot.
          </p>
          <RiotIdForm
            action={updateMyRiotIdAction}
            defaultValue={currentRiotId}
            submitLabel="Mettre à jour mon Riot ID"
          />
        </section>

        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
            Informations
          </h2>
          <form action={updateMyProfileAction} className="grid gap-4">
            <label className={lbl}>
              Pseudo
              <input
                name="pseudo"
                defaultValue={player.pseudo}
                required
                maxLength={40}
                className={input}
              />
            </label>
            <div className={lbl}>
              Pays
              <CountrySelect name="nationality" defaultValue={nationality} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={lbl}>
                Rôle principal
                <select
                  name="valorantRole"
                  defaultValue={player.valorantRole ?? ""}
                  className={input}
                >
                  <option value="">Aucun</option>
                  {VALORANT_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </label>
              <label className={lbl}>
                Date de naissance
                <input name="birthdate" type="date" defaultValue={birthdateValue} className={input} />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={lbl}>
                Twitter (x.com)
                <input
                  name="twitter"
                  type="url"
                  placeholder="https://x.com/…"
                  defaultValue={socials.twitter ?? ""}
                  className={input}
                />
              </label>
              <label className={lbl}>
                Twitch (twitch.tv)
                <input
                  name="twitch"
                  type="url"
                  placeholder="https://twitch.tv/…"
                  defaultValue={socials.twitch ?? ""}
                  className={input}
                />
              </label>
            </div>
            <div className={lbl}>
              Photo
              <ImageUpload name="photo" shape="round" currentUrl={player.photo} />
            </div>
            <button className="mt-1 justify-self-start rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90">
              Enregistrer
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
