import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ensurePlayerForUser } from "@/lib/data/players";
import AccountTypeFields from "@/components/account-type-fields";
import { submitOnboarding } from "@/app/onboarding/actions";
import { NOINDEX } from "@/lib/metadata";

export const metadata = { title: "Bienvenue", ...NOINDEX };

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin");

  // La fiche existe déjà dans le cas normal ; on la garantit ici pour pouvoir
  // pré-remplir le formulaire avec le pseudo et l'avatar Discord.
  const player = await ensurePlayerForUser(session.user.id, {
    pseudo: session.user.name,
    photo: session.user.image,
  });

  // Riot ID déjà lié : on passe par la route qui pose le cookie. Une page ne
  // peut pas écrire de cookie elle-même.
  // Inscription déjà terminée : on repasse par la route qui pose le cookie,
  // une page ne pouvant pas en écrire. Le `puuid` vaut marqueur pour les
  // fiches créées avant `onboardedAt`, qui n'ont donc pas à repasser ici.
  if (player.onboardedAt || player.puuid) redirect("/api/onboarded");

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
        Complète ton profil pour accéder au site. Dis-nous d&apos;abord ce que tu viens y faire : le
        reste s&apos;adapte.
      </p>

      <form action={submitOnboarding} className="mt-6 grid gap-6">
        <AccountTypeFields
          withRiotId
          defaultType={player.accountType}
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
