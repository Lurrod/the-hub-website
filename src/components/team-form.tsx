import { REGIONS } from "@/lib/constants";

type TeamFormValues = {
  name?: string;
  tag?: string;
  region?: string;
  description?: string;
  status?: string;
  socials?: { twitter?: string | null; twitch?: string | null; website?: string | null } | null;
};

export default function TeamForm({
  action,
  values,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  values?: TeamFormValues;
  submitLabel: string;
}) {
  const s = values?.socials ?? {};
  const input =
    "w-full rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-white";
  return (
    <form action={action} className="grid max-w-xl gap-4">
      <label className="grid gap-1 text-sm text-[var(--text-muted)]">
        Nom
        <input name="name" defaultValue={values?.name ?? ""} required className={input} />
      </label>
      <label className="grid gap-1 text-sm text-[var(--text-muted)]">
        Tag
        <input name="tag" defaultValue={values?.tag ?? ""} required maxLength={8} className={input} />
      </label>
      <label className="grid gap-1 text-sm text-[var(--text-muted)]">
        Région
        <select name="region" defaultValue={values?.region ?? REGIONS[0]} className={input}>
          {REGIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm text-[var(--text-muted)]">
        Description
        <textarea name="description" defaultValue={values?.description ?? ""} rows={4} className={input} />
      </label>
      <label className="grid gap-1 text-sm text-[var(--text-muted)]">
        Statut
        <select name="status" defaultValue={values?.status ?? "ACTIVE"} className={input}>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm text-[var(--text-muted)]">
        Logo (png/jpg/webp, max 5 Mo)
        <input type="file" name="logo" accept="image/png,image/jpeg,image/webp" className={input} />
      </label>
      <fieldset className="grid gap-2">
        <legend className="text-sm text-[var(--text-muted)]">Réseaux (optionnel)</legend>
        <input name="twitter" placeholder="https://x.com/…" defaultValue={s.twitter ?? ""} className={input} />
        <input name="twitch" placeholder="https://twitch.tv/…" defaultValue={s.twitch ?? ""} className={input} />
        <input name="website" placeholder="https://…" defaultValue={s.website ?? ""} className={input} />
      </fieldset>
      <button className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white">
        {submitLabel}
      </button>
    </form>
  );
}
