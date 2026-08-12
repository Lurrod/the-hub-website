import type { AudienceSummary } from "@/lib/data/audience";

/**
 * Zone d'audience du tableau de bord : deux totaux, une tendance, un
 * histogramme par jour et le classement des pages.
 *
 * Tout est en HTML et en CSS — pas de bibliothèque de graphiques pour trente
 * barres. L'histogramme reste lisible au lecteur d'écran : chaque barre porte
 * son jour et ses chiffres en `title`, et le tableau des pages dit la même
 * chose en texte.
 */

const JOUR = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/** Écart en pourcentage entre deux fenêtres, `null` si la précédente est vide. */
function variation(courant: number, precedent: number): number | null {
  if (precedent === 0) return null;
  return Math.round(((courant - precedent) / precedent) * 100);
}

function Chiffre({
  label,
  valeur,
  precision,
}: {
  label: string;
  valeur: number;
  precision: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="text-xs uppercase tracking-wide text-[var(--text-subtle)]">{label}</div>
      <div className="stat mt-1 text-2xl font-semibold text-white">
        {valeur.toLocaleString("fr-FR")}
      </div>
      <div className="mt-0.5 text-xs text-[var(--text-muted)]">{precision}</div>
    </div>
  );
}

export default function AdminAudience({
  summary,
  days,
}: {
  summary: AudienceSummary;
  days: number;
}) {
  const { serie, views, visitors, previousViews, topPages, best } = summary;
  const ecart = variation(views, previousViews);
  // L'échelle se cale sur le pic : à défaut, une journée à trois vues
  // remplirait la hauteur et laisserait croire à une affluence.
  const max = Math.max(...serie.map((p) => p.views), 1);

  return (
    <section aria-labelledby="audience" className="mt-8">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 id="audience" className="text-sm font-semibold uppercase tracking-wide text-white">
          Fréquentation
        </h2>
        <span className="text-xs text-[var(--text-muted)]">{days} derniers jours</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Chiffre
          label="Pages vues"
          valeur={views}
          precision={
            ecart === null
              ? "pas de période précédente"
              : `${ecart >= 0 ? "+" : ""}${ecart} % vs période précédente`
          }
        />
        <Chiffre
          label="Visiteurs"
          valeur={visitors}
          precision={
            visitors > 0
              ? `${(views / visitors).toFixed(1)} page${views / visitors >= 2 ? "s" : ""} par visiteur`
              : "aucune visite mesurée"
          }
        />
        <Chiffre
          label="Meilleur jour"
          valeur={best?.views ?? 0}
          precision={best ? JOUR.format(best.day) : "—"}
        />
      </div>

      {/* Histogramme : une colonne par jour, hauteur proportionnelle au pic. */}
      <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <div
          className="flex h-28 items-end gap-[3px]"
          role="img"
          aria-label={`Pages vues jour par jour sur ${days} jours`}
        >
          {serie.map((p) => (
            <div
              key={p.day.toISOString()}
              title={`${JOUR.format(p.day)} — ${p.views} page${p.views > 1 ? "s" : ""} vue${p.views > 1 ? "s" : ""}, ${p.visitors} visiteur${p.visitors > 1 ? "s" : ""}`}
              className="min-w-0 flex-1 rounded-t-[2px] bg-[var(--accent)] transition-opacity hover:opacity-70"
              style={{
                // Un jour sans trafic garde un filet visible : une colonne
                // absente se confond avec un trou dans la série.
                height: `${p.views === 0 ? 2 : Math.max(4, (p.views / max) * 100)}%`,
                opacity: p.views === 0 ? 0.25 : 1,
              }}
            />
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-[var(--text-subtle)]">
          <span>{JOUR.format(serie[0].day)}</span>
          <span>{JOUR.format(serie[serie.length - 1].day)}</span>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <h3 className="text-xs uppercase tracking-wide text-[var(--text-subtle)]">
          Pages les plus vues
        </h3>
        {topPages.length === 0 ? (
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Aucune visite mesurée sur la période.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {topPages.map((p) => (
              <li key={p.path} className="flex items-center gap-3">
                <span className="min-w-0 flex-1 truncate text-xs text-[var(--text-muted)]">
                  {p.path}
                </span>
                <span className="h-1.5 w-24 shrink-0 rounded-full bg-[var(--bg)] sm:w-40">
                  <span
                    className="block h-full rounded-full bg-[var(--accent)]"
                    style={{ width: `${Math.round((p.views / topPages[0].views) * 100)}%` }}
                  />
                </span>
                <span className="stat w-12 shrink-0 text-right text-xs text-white">{p.views}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-3 text-xs text-[var(--text-subtle)]">
        Mesure anonyme : ni cookie, ni adresse IP conservée. Un visiteur est reconnu à la journée
        par une empreinte salée qui change chaque jour. Les pages d&apos;administration ne sont pas
        comptées.
      </p>
    </section>
  );
}
