import CountrySelect from "@/components/country-select";
import ImageUpload from "@/components/image-upload";

type PlayerFormValues = {
  pseudo?: string;
  nationality?: string;
  riotId?: string;
  photo?: string | null;
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
  const input =
    "w-full rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-white";
  return (
    <form action={action} className="grid max-w-xl gap-4">
      <label className="grid gap-1 text-sm text-[var(--text-muted)]">
        Pseudo
        <input
          name="pseudo"
          defaultValue={values?.pseudo ?? ""}
          required
          maxLength={40}
          className={input}
        />
      </label>
      <div className="grid gap-1 text-sm text-[var(--text-muted)]">
        Pays (optionnel)
        <CountrySelect name="nationality" defaultValue={nationality} />
      </div>
      <label className="grid gap-1 text-sm text-[var(--text-muted)]">
        Riot ID (optionnel, Nom#Tag)
        <input
          name="riotId"
          defaultValue={values?.riotId ?? ""}
          placeholder="Nom#Tag"
          className={input}
        />
      </label>
      <div className="grid gap-1 text-sm text-[var(--text-muted)]">
        Photo (png/jpg/webp, max 5 Mo)
        <ImageUpload name="photo" shape="round" currentUrl={values?.photo ?? null} />
      </div>
      <fieldset className="grid gap-2">
        <legend className="text-sm text-[var(--text-muted)]">Réseaux (optionnel)</legend>
        <input
          name="twitter"
          placeholder="https://x.com/…"
          defaultValue={s.twitter ?? ""}
          className={input}
        />
        <input
          name="twitch"
          placeholder="https://twitch.tv/…"
          defaultValue={s.twitch ?? ""}
          className={input}
        />
      </fieldset>
      <button className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white">
        {submitLabel}
      </button>
    </form>
  );
}
