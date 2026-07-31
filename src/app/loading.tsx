// Squelette affiché instantanément pendant le rendu serveur de n'importe quelle
// route (Suspense au niveau racine) - la navigation paraît immédiate.
// Le battement vient du snippet `14-skeleton-reveal` : l'animation est portée
// par les enfants directs de .t-skel-skeleton, pas par le conteneur.
export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="t-skel-skeleton is-pulsing is-static">
        <div className="skeleton h-9 w-56" />
        <div className="skeleton mt-3 h-4 w-80 max-w-full" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-36 w-full" />
          ))}
        </div>
      </div>
    </main>
  );
}
