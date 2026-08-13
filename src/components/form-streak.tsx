import type { FormResult } from "@/lib/match-context-core";

/**
 * Jetons sémantiques, et non la couleur d'accent : l'orange signale partout
 * ailleurs « actif » ou « mis en avant », pas « gagné ». Une victoire garde
 * ainsi la même couleur que dans les bilans de `team-match-groups.tsx`.
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

const SIZES = {
  sm: "h-4 w-4 text-[9px]",
  md: "h-5 w-5 text-[10px]",
} as const;

/**
 * Suite de résultats d'une équipe, du plus ancien au plus récent.
 *
 * Une pastille isolée est illisible pour un lecteur d'écran — « V V D » ne veut
 * rien dire à l'oreille : la série entière porte donc un nom accessible, et
 * chaque pastille est masquée.
 */
export default function FormStreak({
  results,
  teamName,
  size = "md",
}: {
  /** Du plus ancien au plus récent, tel que le rend `formStreak`. */
  results: readonly FormResult[];
  /** Sert à composer le nom accessible : « Forme de … ». */
  teamName: string;
  /** `sm` pour un tableau dense, `md` pour une fiche. */
  size?: keyof typeof SIZES;
}) {
  if (results.length === 0) {
    return <span className="text-[var(--text-subtle)]">–</span>;
  }
  const spoken = results.map((r) => PILLS[r].description).join(", ");
  return (
    <span
      role="img"
      className="flex shrink-0 items-center gap-1"
      title={spoken}
      aria-label={`Forme de ${teamName}, du plus ancien au plus récent : ${spoken}`}
    >
      {results.map((result, index) => (
        <span
          key={index}
          aria-hidden
          className={`stat grid place-items-center rounded font-semibold ${SIZES[size]} ${PILLS[result].className}`}
        >
          {PILLS[result].label}
        </span>
      ))}
    </span>
  );
}
