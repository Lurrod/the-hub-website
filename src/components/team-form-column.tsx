import MatchMiniList, { type MiniMatch } from "@/components/match-mini-list";
import type { FormResult } from "@/lib/match-context-core";

/**
 * Mêmes jetons que les bilans de `team-match-groups.tsx` : la couleur d'une
 * victoire ne doit pas changer d'une page à l'autre.
 */
const PILLS: Record<FormResult, { label: string; description: string; className: string }> = {
  WIN: {
    label: "V",
    description: "victoire",
    className: "bg-[var(--success-soft)] text-[var(--success)]",
  },
  LOSS: {
    label: "D",
    description: "défaite",
    className: "bg-[var(--destructive-soft)] text-[var(--destructive)]",
  },
  DRAW: {
    label: "-",
    description: "sans vainqueur",
    className: "bg-[var(--bg)] text-[var(--text-muted)]",
  },
};

/**
 * L'état de forme d'une équipe : son nom, sa série de résultats et ses
 * derniers matchs. Le composant ne fait aucune requête et ignore tout du match
 * depuis lequel on le regarde — il reçoit une liste déjà bornée et déjà
 * ordonnée.
 */
export default function TeamFormColumn({
  name,
  form,
  matches,
}: {
  name: string;
  /**
   * Du plus ancien au plus récent, tel que le rend `formResults`. Décrit les
   * mêmes rencontres que `matches` — rien ne lie leurs longueurs, un appelant
   * distrait ne verrait rien exploser.
   */
  form: FormResult[];
  /** Du plus récent au plus ancien, tel que le rend la requête. */
  matches: MiniMatch[];
}) {
  const formLabel = `Forme de ${name}, du plus ancien au plus récent : ${form
    .map((r) => PILLS[r].description)
    .join(", ")}`;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium text-white">{name}</span>
        {form.length > 0 && (
          // Les pastilles sont illisibles une par une pour un lecteur d'écran :
          // la série entière porte donc un rôle et un nom accessibles, et
          // chaque pastille est masquée. `role="img"` est nécessaire : un
          // `<span>` n'a pas de rôle implicite qui porte de nom accessible, et
          // sans lui l'`aria-label` serait ignoré par les lecteurs d'écran.
          <span
            role="img"
            title={formLabel}
            aria-label={formLabel}
            className="flex shrink-0 items-center gap-1"
          >
            {form.map((result, index) => (
              <span
                key={index}
                aria-hidden
                className={`stat grid h-5 w-5 place-items-center rounded text-[10px] font-semibold ${PILLS[result].className}`}
              >
                {PILLS[result].label}
              </span>
            ))}
          </span>
        )}
      </div>
      <MatchMiniList matches={matches} empty="Aucun match joué avant celui-ci." />
    </div>
  );
}
