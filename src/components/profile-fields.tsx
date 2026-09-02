import CountrySelect from "@/components/country-select";
import DateField from "@/components/date-field";
import ErrorShake from "@/components/error-shake";
import ImageUpload from "@/components/image-upload";
import { VALORANT_ROLES, ROLE_LABELS } from "@/lib/roles";

const input =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-white transition-colors focus:border-[var(--accent)]";
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
export default function ProfileFields({
  values,
  showValorantRole = true,
}: {
  values: ProfileFieldValues;
  /**
   * Le rôle Valorant ne concerne que les joueurs. Masqué, le champ n'est pas
   * seulement caché : il n'est pas rendu, donc rien n'est envoyé — un coach ne
   * doit pas conserver un rôle choisi avant de changer de type de compte.
   */
  showValorantRole?: boolean;
}) {
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
        {showValorantRole && (
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
        )}
        <label className={lbl}>
          Date de naissance
          <DateField name="birthdate" defaultValue={values.birthdate} className={input} />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <ErrorShake codes={["twitter"]}>
          <label className={lbl}>
            Twitter (x.com)
            <input
              name="twitter"
              type="url"
              placeholder="https://x.com/…"
              defaultValue={values.twitter}
              className={`t-input ${input}`}
            />
          </label>
        </ErrorShake>
        <ErrorShake codes={["twitch"]}>
          <label className={lbl}>
            Twitch (twitch.tv)
            <input
              name="twitch"
              type="url"
              placeholder="https://twitch.tv/…"
              defaultValue={values.twitch}
              className={`t-input ${input}`}
            />
          </label>
        </ErrorShake>
      </div>
      <div className={lbl}>
        Photo
        <ImageUpload
          name="photo"
          label="Ta photo de profil"
          shape="round"
          currentUrl={values.photo}
        />
      </div>
    </>
  );
}
