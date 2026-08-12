/**
 * Squelette d'une fiche joueur : en-tête, onglets, colonne de matchs et
 * tuiles de statistiques.
 *
 * Il vaut mieux qu'un squelette générique : la page ne bouge pas au moment où
 * le contenu arrive, là où une forme approximative fait sauter la mise en page
 * sous les yeux. Le fondu croisé vient de `app/template.tsx`.
 */
export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="t-skel-skeleton is-pulsing is-static">
        {/* En-tête : pastille, pseudo, réseaux */}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-center gap-4">
            <div className="skeleton h-20 w-20 rounded-full" />
            <div className="min-w-0 flex-1">
              <div className="skeleton h-7 w-48 max-w-full" />
              <div className="skeleton mt-3 h-4 w-64 max-w-full" />
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="mt-4 flex gap-6">
          {["w-16", "w-20", "w-20"].map((w, i) => (
            <div key={i} className={`skeleton h-4 ${w}`} />
          ))}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[16rem_1fr]">
          <div className="flex flex-col gap-3">
            <div className="skeleton h-4 w-24" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-14 w-full" />
            ))}
          </div>

          <div className="flex flex-col gap-8">
            <div className="grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton h-24 w-full" />
              ))}
            </div>
            <div className="skeleton h-52 w-full" />
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="skeleton h-56 w-full" />
              <div className="skeleton h-56 w-full" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
