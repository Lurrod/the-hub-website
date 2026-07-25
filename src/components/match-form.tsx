import {
  MATCH_STAGES,
  MATCH_STAGE_LABELS,
  MATCH_STATUSES,
  MATCH_STATUS_LABELS,
  BEST_OF_OPTIONS,
  type MatchStage,
} from "@/lib/constants";

type Team = { id: string; name: string };
type Group = { id: string; name: string };

type MatchFormValues = {
  teamAId?: string;
  teamBId?: string;
  scoreA?: number;
  scoreB?: number;
  stage?: string;
  status?: string;
  bestOf?: number;
  groupId?: string;
  round?: string;
  bracketPosition?: number;
  date?: string;
  vodUrl?: string;
};

export default function MatchForm({
  action,
  teams,
  groups,
  values,
  submitLabel,
  stages = MATCH_STAGES,
}: {
  action: (formData: FormData) => void;
  teams: Team[];
  groups: Group[];
  values?: MatchFormValues;
  submitLabel: string;
  stages?: readonly MatchStage[];
}) {
  const input =
    "w-full rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-white";
  const lbl = "grid gap-1 text-sm text-[var(--text-muted)]";
  return (
    <form action={action} className="grid max-w-xl gap-4">
      <div className="grid grid-cols-2 gap-4">
        <label className={lbl}>
          Équipe A
          <select name="teamAId" defaultValue={values?.teamAId ?? ""} required className={input}>
            <option value="">— Équipe A —</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className={lbl}>
          Équipe B
          <select name="teamBId" defaultValue={values?.teamBId ?? ""} required className={input}>
            <option value="">— Équipe B —</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <label className={lbl}>
          Score A (maps)
          <input type="number" min="0" name="scoreA" defaultValue={values?.scoreA ?? 0} className={input} />
        </label>
        <label className={lbl}>
          Score B (maps)
          <input type="number" min="0" name="scoreB" defaultValue={values?.scoreB ?? 0} className={input} />
        </label>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <label className={lbl}>
          Phase
          <select name="stage" defaultValue={values?.stage ?? stages[0]} className={input}>
            {stages.map((s) => (
              <option key={s} value={s}>
                {MATCH_STAGE_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className={lbl}>
          Statut
          <select name="status" defaultValue={values?.status ?? "SCHEDULED"} className={input}>
            {MATCH_STATUSES.map((s) => (
              <option key={s} value={s}>
                {MATCH_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className={lbl}>
          Format
          <select name="bestOf" defaultValue={values?.bestOf ?? 1} className={input}>
            {BEST_OF_OPTIONS.map((n) => (
              <option key={n} value={n}>
                BO{n}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className={lbl}>
        Poule (si phase = Poule)
        <select name="groupId" defaultValue={values?.groupId ?? ""} className={input}>
          <option value="">— Aucune —</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-4">
        <label className={lbl}>
          Tour (si Playoffs, ex. « Finale »)
          <input name="round" defaultValue={values?.round ?? ""} className={input} />
        </label>
        <label className={lbl}>
          Position bracket
          <input
            type="number"
            min="0"
            name="bracketPosition"
            defaultValue={values?.bracketPosition ?? ""}
            className={input}
          />
        </label>
      </div>
      <label className={lbl}>
        Date (optionnel)
        <input type="date" name="date" defaultValue={values?.date ?? ""} className={input} />
      </label>
      <label className={lbl}>
        Lien VOD/stream (optionnel)
        <input
          type="url"
          name="vodUrl"
          placeholder="https://twitch.tv/videos/…"
          defaultValue={values?.vodUrl ?? ""}
          className={input}
        />
      </label>
      <button className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white">
        {submitLabel}
      </button>
    </form>
  );
}
