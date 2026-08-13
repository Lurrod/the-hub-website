import Link from "next/link";
import { EmptyLine } from "@/components/empty-state";
import { shortDate } from "@/lib/dates";
import FormStreak from "@/components/form-streak";
import { formStreak, type FormEntry, type FormResult } from "@/lib/match-context-core";

const SCORE_COLOR: Record<FormResult, string> = {
  WIN: "text-[var(--success)]",
  LOSS: "text-[var(--destructive)]",
  DRAW: "text-[var(--text-muted)]",
};

/**
 * Une rencontre sur une ligne : la date, l'adversaire, le score.
 *
 * En miroir, c'est le tag qui absorbe l'espace libre et non une marge
 * automatique : `ml-auto` pousserait le score vers le centre au lieu du bord
 * dès que la ligne s'inverse.
 */
function FormRow({ entry, align }: { entry: FormEntry; align: "left" | "right" }) {
  const mirrored = align === "right";
  return (
    <li>
      <Link
        href={`/matchs/${entry.id}`}
        className={`flex items-center gap-2 rounded px-2 py-1.5 transition-colors hover:bg-[var(--card-hover)] ${
          mirrored ? "sm:flex-row-reverse" : ""
        }`}
      >
        <span className="stat w-11 shrink-0 text-[10px] text-[var(--text-muted)]">
          {shortDate(entry.date)}
        </span>
        {entry.opponent.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            loading="lazy"
            decoding="async"
            src={entry.opponent.logo}
            alt=""
            className="h-4 w-4 shrink-0 rounded object-cover"
          />
        ) : (
          <div className="grid h-4 w-4 shrink-0 place-items-center rounded bg-[var(--bg)] text-[8px] text-[var(--text-muted)]">
            {entry.opponent.tag.slice(0, 1).toUpperCase()}
          </div>
        )}
        <span className={`flex-1 truncate text-xs text-white ${mirrored ? "sm:text-right" : ""}`}>
          {entry.opponent.name}
        </span>
        <span className={`stat shrink-0 text-xs font-semibold ${SCORE_COLOR[entry.result]}`}>
          {entry.scoreFor} - {entry.scoreAgainst}
        </span>
      </Link>
    </li>
  );
}

/**
 * L'état de forme d'une équipe : son nom, sa série de résultats et ses
 * dernières rencontres, chacune tenant sur une ligne.
 *
 * Le composant ne fait aucune requête et ignore tout du match depuis lequel on
 * le regarde — il reçoit des entrées déjà bornées, déjà ordonnées et déjà
 * tournées de son côté.
 */
export default function TeamFormColumn({
  team,
  align,
  entries,
}: {
  team: { name: string; tag: string; logo: string | null };
  /**
   * Côté occupé par la colonne. À droite, la ligne d'en-tête est rendue en
   * miroir : les deux logos se retrouvent aux bords extérieurs de la grille,
   * comme le bandeau du haut de page.
   *
   * Le miroir ne vaut qu'à partir de `sm` : sous ce point de rupture les deux
   * colonnes s'empilent, et une seconde ligne inversée ne renvoie plus à rien.
   */
  align: "left" | "right";
  entries: FormEntry[];
}) {
  const { name } = team;
  const streak = formStreak(entries);
  return (
    <div>
      <div
        className={`mb-2 flex items-center justify-between gap-2 rounded-[var(--r-sm)] bg-[var(--card-hover)] px-2 py-1.5 ${
          align === "right" ? "sm:flex-row-reverse" : ""
        }`}
      >
        <span
          className={`flex min-w-0 items-center gap-2 ${align === "right" ? "sm:flex-row-reverse" : ""}`}
        >
          {team.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              loading="lazy"
              decoding="async"
              src={team.logo}
              alt=""
              className="h-5 w-5 shrink-0 rounded object-cover"
            />
          ) : (
            <span className="monogram grid h-5 w-5 shrink-0 place-items-center rounded text-[8px]">
              {team.tag.slice(0, 3).toUpperCase()}
            </span>
          )}
          <span className="truncate text-sm font-medium text-white">{name}</span>
        </span>
        {streak.length > 0 && <FormStreak results={streak} teamName={name} />}
      </div>
      {entries.length === 0 ? (
        <EmptyLine>Aucun match joué avant celui-ci.</EmptyLine>
      ) : (
        <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-lg border border-[var(--border)]">
          {entries.map((entry) => (
            <FormRow key={entry.id} entry={entry} align={align} />
          ))}
        </ul>
      )}
    </div>
  );
}
