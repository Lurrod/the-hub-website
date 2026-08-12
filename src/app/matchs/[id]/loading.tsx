/** Squelette d'une fiche de match : affiche, sélecteur de carte, scoreboard. */
export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="t-skel-skeleton is-pulsing is-static">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="skeleton h-12 w-12 rounded-lg" />
              <div className="skeleton h-6 w-40 max-w-full" />
            </div>
            <div className="skeleton h-9 w-24 shrink-0" />
            <div className="flex min-w-0 items-center justify-end gap-3">
              <div className="skeleton h-6 w-40 max-w-full" />
              <div className="skeleton h-12 w-12 rounded-lg" />
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-9 w-24" />
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="skeleton h-10 w-full" />
          ))}
        </div>
      </div>
    </main>
  );
}
