/** Squelette d'une page de tournoi : bandeau, onglets, tableau. */
export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="t-skel-skeleton is-pulsing is-static">
        <div className="skeleton h-40 w-full" />

        <div className="mt-4 flex gap-6">
          {["w-20", "w-16", "w-24", "w-20"].map((w, i) => (
            <div key={i} className={`skeleton h-4 ${w}`} />
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton h-12 w-full" />
          ))}
        </div>
      </div>
    </main>
  );
}
