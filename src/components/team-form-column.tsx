import MatchMiniList, { type MiniMatch } from "@/components/match-mini-list";
import type { FormResult } from "@/lib/match-context-core";

/**
 * Mêmes jetons que les bilans de `team-match-groups.tsx` : la couleur d'une
 * victoire ne doit pas changer d'une page à l'autre.
 */
const PILLS: Record<FormResult, { label: string; title: string; className: string }> = {
  WIN: {
    label: "V",
    title: "victoire",
    className: "bg-[var(--success-soft)] text-[var(--success)]",
  },
  LOSS: {
    label: "D",
    title: "défaite",
    className: "bg-[var(--destructive-soft)] text-[var(--destructive)]",
  },
  DRAW: {
    label: "-",
    title: "sans vainqueur",
    className: "bg-[var(--bg)] text-[var(--text-subtle)]",
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
  /** Du plus ancien au plus récent, tel que le rend `formResults`. */
  form: FormResult[];
  /** Du plus récent au plus ancien, tel que le rend la requête. */
  matches: MiniMatch[];
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium text-white">{name}</span>
        {form.length > 0 && (
          // Les pastilles sont illisibles une par une pour un lecteur d'écran :
          // la série entière porte donc un libellé, et chaque pastille est
          // masquée.
          <span
            className="flex shrink-0 items-center gap-1"
            aria-label={`Forme de ${name} : ${form.map((r) => PILLS[r].title).join(", ")}`}
          >
            {form.map((result, index) => (
              <span
                key={`${index}-${result}`}
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
