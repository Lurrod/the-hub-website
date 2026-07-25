const STYLES: Record<string, string> = {
  UPCOMING: "bg-[var(--accent-2)]/15 text-[var(--accent-2)]",
  ONGOING: "bg-[var(--accent-soft)] text-[var(--accent)]",
  FINISHED: "bg-[var(--border)] text-[var(--text-muted)]",
  SCHEDULED: "bg-[var(--accent-2)]/15 text-[var(--accent-2)]",
  LIVE: "bg-[var(--accent-soft)] text-[var(--accent)]",
};

const LIVE_STATUSES = new Set(["ONGOING", "LIVE"]);

export default function StatusBadge({ label, status }: { label: string; status: string }) {
  const cls = STYLES[status] ?? "bg-[var(--border)] text-[var(--text-muted)]";
  const live = LIVE_STATUSES.has(status);
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-[var(--r-sm)] px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      {live ? <span className="live-dot" aria-hidden="true" /> : null}
      {label}
    </span>
  );
}
