import CountrySelect from "@/components/country-select";
import ImageUpload from "@/components/image-upload";
import { VALORANT_ROLES, ROLE_LABELS } from "@/lib/roles";

const input =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[var(--accent)]";
const lbl = "grid gap-1 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]";

export type ProfileFieldValues = {
  pseudo: string;
  nationality: string;
  valorantRole: string;
  birthdate: string;
  twitter: string;
  twitch: string;
  photo: string | null;
};

/**
 * Champs du profil joueur, sans <form> ni bouton : chaque page fournit son
 * propre formulaire et sa propre server action (paramètres et onboarding
 * n'enregistrent pas la même chose).
 */
export default function ProfileFields({ values }: { values: ProfileFieldValues }) {
  return (
    <>
      <label className={lbl}>
        Pseudo
        <input
          name="pseudo"
          defaultValue={values.pseudo}
          required
          maxLength={40}
          className={input}
        />
      </label>
      <div className={lbl}>
        Pays
        <CountrySelect name="nationality" defaultValue={values.nationality} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={lbl}>
          Rôle principal
          <select name="valorantRole" defaultValue={values.valorantRole} className={input}>
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
          <input name="birthdate" type="date" defaultValue={values.birthdate} className={input} />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={lbl}>
          Twitter (x.com)
          <input
            name="twitter"
            type="url"
            placeholder="https://x.com/…"
            defaultValue={values.twitter}
            className={input}
          />
        </label>
        <label className={lbl}>
          Twitch (twitch.tv)
          <input
            name="twitch"
            type="url"
            placeholder="https://twitch.tv/…"
            defaultValue={values.twitch}
            className={input}
          />
        </label>
      </div>
      <div className={lbl}>
        Photo
        <ImageUpload name="photo" shape="round" currentUrl={values.photo} />
      </div>
    </>
  );
}
