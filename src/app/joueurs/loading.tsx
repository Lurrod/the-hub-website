/** Squelette de l'annuaire : barre de filtres puis lignes de classement. */
export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="t-skel-skeleton is-pulsing is-static">
        <div className="skeleton h-9 w-40" />
        <div className="skeleton mt-3 h-4 w-72 max-w-full" />

        <div className="mt-6 flex flex-wrap gap-2">
          {["w-40", "w-32", "w-28", "w-28"].map((w, i) => (
            <div key={i} className={`skeleton h-9 ${w}`} />
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-1.5">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="skeleton h-12 w-full" />
          ))}
        </div>
      </div>
    </main>
  );
}
