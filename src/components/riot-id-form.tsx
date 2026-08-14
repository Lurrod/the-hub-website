import ErrorShake from "@/components/error-shake";

/** Codes de retour Riot qui désignent le champ Riot ID comme fautif. */
const RIOT_ERROR_CODES = ["riotformat", "riotnotfound", "riottaken"] as const;

const input =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-white focus:border-[var(--accent)]";

export default function RiotIdForm({
  action,
  defaultValue = "",
  submitLabel,
}: {
  action: (formData: FormData) => void;
  defaultValue?: string;
  submitLabel: string;
}) {
  return (
    <form action={action} className="grid gap-3">
      <ErrorShake codes={RIOT_ERROR_CODES}>
        <label className="grid gap-1 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
          Riot ID
          <input
            name="riotId"
            defaultValue={defaultValue}
            required
            placeholder="Nom#Tag (ex. Hub Player#EUW1)"
            className={`t-input ${input}`}
          />
        </label>
      </ErrorShake>
      <button className="justify-self-start rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90">
        {submitLabel}
      </button>
    </form>
  );
}
