/**
 * Jauge : une part rapportée à un plafond, sur une piste de la même famille.
 * La forme juste pour un ratio unique — un camembert à deux parts dirait la
 * même chose en moins lisible.
 */
export default function Meter({
  label,
  value,
  max = 100,
  valueLabel,
  sub,
}: {
  label: string;
  value: number;
  max?: number;
  valueLabel: string;
  sub?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
          {label}
        </span>
        <span style={{ fontSize: "18px" }} className="stat font-bold leading-none text-white">
          {valueLabel}
        </span>
      </div>
      <div className="relative mt-3 h-2 rounded bg-[var(--bg)]">
        <div
          className="absolute inset-y-0 left-0 bg-[var(--accent)]"
          style={{ width: `${pct}%`, borderRadius: "2px 4px 4px 2px" }}
        />
      </div>
      {sub && <div className="mt-2 text-[11px] text-[var(--text-muted)]">{sub}</div>}
    </div>
  );
}
