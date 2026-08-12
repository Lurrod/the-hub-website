/** Squelette d'une fiche d'équipe : bandeau, effectif, puis matchs. */
export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="t-skel-skeleton is-pulsing is-static">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-center gap-4">
            <div className="skeleton h-20 w-20 rounded-lg" />
            <div className="min-w-0 flex-1">
              <div className="skeleton h-7 w-56 max-w-full" />
              <div className="skeleton mt-3 h-4 w-40" />
            </div>
          </div>
        </div>

        <div className="skeleton mt-8 h-4 w-24" />
        <div className="mt-3 flex flex-wrap gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-40 w-40" />
          ))}
        </div>

        <div className="skeleton mt-10 h-4 w-28" />
        <div className="mt-3 flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-14 w-full" />
          ))}
        </div>
      </div>
    </main>
  );
}
