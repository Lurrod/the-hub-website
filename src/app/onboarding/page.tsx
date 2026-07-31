import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ensurePlayerForUser } from "@/lib/data/players";
import ProfileFields from "@/components/profile-fields";
import { submitOnboarding } from "@/app/onboarding/actions";

export const metadata = { title: "Bienvenue" };

const input =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[var(--accent)]";
const lbl = "grid gap-1 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin");

  // La fiche existe déjà dans le cas normal ; on la garantit ici pour pouvoir
  // pré-remplir le formulaire avec le pseudo et l'avatar Discord.
  const player = await ensurePlayerForUser(session.user.id, {
    pseudo: session.user.name,
    photo: session.user.image,
  });

  if (player.puuid) {
    const store = await cookies();
    store.set("onboarded", "1", { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
    redirect("/");
  }

  const socials = (player.socials ?? {}) as { twitter?: string; twitch?: string };
  const birthdateValue = player.birthdate
    ? new Date(player.birthdate).toISOString().slice(0, 10)
    : "";

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
        Bienvenue
      </h1>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        Complète ton profil joueur pour accéder au site. Seul le Riot ID est obligatoire.
      </p>

      <form action={submitOnboarding} className="mt-6 grid gap-6">
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
            Compte Valorant
          </h2>
          <p className="mb-4 text-xs text-[var(--text-muted)]">
            Ton Riot ID sert à relier tes matchs et tes statistiques. On vérifie qu&apos;il existe
            auprès de Riot.
          </p>
          <label className={lbl}>
            Riot ID
            <input
              name="riotId"
              required
              placeholder="Nom#Tag (ex. Hub Player#EUW1)"
              className={input}
            />
          </label>
        </section>

        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
            Informations
          </h2>
          <div className="grid gap-4">
            <ProfileFields
              values={{
                pseudo: player.pseudo,
                nationality: player.nationality ?? "",
                valorantRole: player.valorantRole ?? "",
                birthdate: birthdateValue,
                twitter: socials.twitter ?? "",
                twitch: socials.twitch ?? "",
                photo: player.photo,
              }}
            />
          </div>
        </section>

        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
            Recherche d&apos;équipe
          </h2>
          <label className="flex items-start gap-3 text-sm text-white">
            <input
              type="checkbox"
              name="lft"
              value="1"
              defaultChecked={player.lft}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
            />
            <span>
              Me déclarer LFT
              <span className="mt-1 block text-xs text-[var(--text-muted)]">
                Ta fiche apparaîtra sur la page LFT. Tu pourras changer ça à tout moment dans tes
                paramètres.
              </span>
            </span>
          </label>
        </section>

        <button className="justify-self-start rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90">
          Valider et continuer
        </button>
      </form>
    </main>
  );
}
