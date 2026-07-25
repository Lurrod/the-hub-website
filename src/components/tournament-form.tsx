import {
  REGIONS,
  TOURNAMENT_FORMATS,
  TOURNAMENT_FORMAT_LABELS,
  TOURNAMENT_STATUSES,
  TOURNAMENT_STATUS_LABELS,
} from "@/lib/constants";

type TournamentFormValues = {
  name?: string;
  region?: string;
  format?: string;
  status?: string;
  startDate?: string; // format "YYYY-MM-DD"
  endDate?: string; // format "YYYY-MM-DD"
  prizePool?: string;
  organizer?: string;
  description?: string;
};

export default function TournamentForm({
  action,
  values,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  values?: TournamentFormValues;
  submitLabel: string;
}) {
  const input =
    "w-full rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-white";
  const lbl = "grid gap-1 text-sm text-[var(--text-muted)]";
  return (
    <form action={action} className="grid max-w-xl gap-4">
      <label className={lbl}>
        Nom
        <input name="name" defaultValue={values?.name ?? ""} required className={input} />
      </label>
      <label className={lbl}>
        Région
        <select name="region" defaultValue={values?.region ?? REGIONS[0]} className={input}>
          {REGIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
      <label className={lbl}>
        Format
        <select name="format" defaultValue={values?.format ?? TOURNAMENT_FORMATS[0]} className={input}>
          {TOURNAMENT_FORMATS.map((f) => (
            <option key={f} value={f}>
              {TOURNAMENT_FORMAT_LABELS[f]}
            </option>
          ))}
        </select>
      </label>
      <label className={lbl}>
        Statut
        <select name="status" defaultValue={values?.status ?? "UPCOMING"} className={input}>
          {TOURNAMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {TOURNAMENT_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-4">
        <label className={lbl}>
          Début
          <input type="date" name="startDate" defaultValue={values?.startDate ?? ""} className={input} />
        </label>
        <label className={lbl}>
          Fin
          <input type="date" name="endDate" defaultValue={values?.endDate ?? ""} className={input} />
        </label>
      </div>
      <label className={lbl}>
        Cash prize (optionnel)
        <input name="prizePool" defaultValue={values?.prizePool ?? ""} placeholder="ex. 500 €" className={input} />
      </label>
      <label className={lbl}>
        Organisateur (optionnel)
        <input name="organizer" defaultValue={values?.organizer ?? ""} className={input} />
      </label>
      <label className={lbl}>
        Description
        <textarea name="description" defaultValue={values?.description ?? ""} rows={4} className={input} />
      </label>
      <label className={lbl}>
        Logo carré (png/jpg/webp, max 5 Mo)
        <input type="file" name="logo" accept="image/png,image/jpeg,image/webp" className={input} />
      </label>
      <label className={lbl}>
        Bannière large (png/jpg/webp, max 5 Mo)
        <input type="file" name="banner" accept="image/png,image/jpeg,image/webp" className={input} />
      </label>
      <button className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white">
        {submitLabel}
      </button>
    </form>
  );
}
