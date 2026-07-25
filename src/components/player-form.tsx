import { COUNTRIES } from "@/lib/constants";

type PlayerFormValues = {
  pseudo?: string;
  nationality?: string;
  socials?: { twitter?: string | null; twitch?: string | null } | null;
};

export default function PlayerForm({
  action,
  values,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  values?: PlayerFormValues;
  submitLabel: string;
}) {
  const s = values?.socials ?? {};
  const nationality = values?.nationality ?? "";
  const nationalityKnown = (COUNTRIES as readonly string[]).includes(nationality);
  const input =
    "w-full rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-white";
  return (
    <form action={action} className="grid max-w-xl gap-4">
      <label className="grid gap-1 text-sm text-[var(--text-muted)]">
        Pseudo
        <input name="pseudo" defaultValue={values?.pseudo ?? ""} required maxLength={40} className={input} />
      </label>
      <label className="grid gap-1 text-sm text-[var(--text-muted)]">
        Pays (optionnel)
        <select name="nationality" defaultValue={nationality} className={input}>
          <option value="">—</option>
          {nationality && !nationalityKnown && <option value={nationality}>{nationality}</option>}
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm text-[var(--text-muted)]">
        Photo (png/jpg/webp, max 5 Mo)
        <input type="file" name="photo" accept="image/png,image/jpeg,image/webp" className={input} />
      </label>
      <fieldset className="grid gap-2">
        <legend className="text-sm text-[var(--text-muted)]">Réseaux (optionnel)</legend>
        <input name="twitter" placeholder="https://x.com/…" defaultValue={s.twitter ?? ""} className={input} />
        <input name="twitch" placeholder="https://twitch.tv/…" defaultValue={s.twitch ?? ""} className={input} />
      </fieldset>
      <button className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white">
        {submitLabel}
      </button>
    </form>
  );
}
