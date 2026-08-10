/**
 * Barres horizontales, une seule teinte.
 *
 * Les catégories (agents, maps) sont nominales : les colorer par leur valeur
 * doublerait l'information déjà portée par la longueur de la barre et gâcherait
 * le seul canal d'identité disponible. Une série = une couleur.
 *
 * `reference` trace un repère vertical (ex. 50 % sur un winrate) : c'est un
 * seuil, pas une grille, d'où le pointillé.
 */
export type BarItem = {
  key: string;
  label: string;
  /** Valeur qui dessine la barre, dans l'échelle de `max`. */
  value: number;
  /** Texte affiché au bout de la barre. À défaut, `value`. */
  valueLabel?: string;
  /** Contexte à droite du libellé (ex. « 12 maps »). */
  note?: string;
  icon?: React.ReactNode;
  title?: string;
};

export default function BarList({
  items,
  max,
  reference,
  referenceLabel,
}: {
  items: BarItem[];
  /** Borne haute de l'échelle. Par défaut la plus grande valeur. */
  max?: number;
  reference?: number;
  referenceLabel?: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-[var(--text-muted)]">Pas encore de données.</p>;
  }
  const top = Math.max(max ?? 0, ...items.map((i) => i.value), 1);
  const pct = (v: number) => Math.max(0, Math.min(100, (v / top) * 100));

  return (
    <div className="flex flex-col gap-2.5">
      {items.map((item) => (
        <div key={item.key} className="flex items-center gap-3" title={item.title}>
          <div className="flex w-28 shrink-0 items-center gap-1.5 sm:w-36">
            {item.icon}
            <span className="truncate text-xs text-white">{item.label}</span>
          </div>

          <div className="relative h-5 min-w-0 flex-1">
            {/* Piste : une teinte de la surface, jamais une bordure autour de la barre. */}
            <div className="absolute inset-y-0 left-0 right-0 rounded bg-[var(--bg)]" />
            <div
              className="absolute inset-y-0 left-0 rounded-r bg-[var(--accent)]"
              style={{ width: `${pct(item.value)}%`, borderRadius: "2px 4px 4px 2px" }}
            />
            {reference != null && (
              <div
                className="absolute inset-y-0 w-px border-l border-dashed border-[var(--text-subtle)]"
                style={{ left: `${pct(reference)}%` }}
                title={referenceLabel}
              />
            )}
          </div>

          <div className="flex w-24 shrink-0 items-baseline justify-end gap-1.5">
            <span className="stat text-xs font-semibold text-white">
              {item.valueLabel ?? item.value}
            </span>
            {item.note && <span className="text-[10px] text-[var(--text-muted)]">{item.note}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
