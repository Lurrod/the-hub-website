import { EmptyLine } from "@/components/empty-state";
import MatchMiniList, { type MiniMatch } from "@/components/match-mini-list";

/** `shrink-0` : le titre reste entier quand la section se comprime, seule la
    liste sous lui doit céder de la hauteur. */
const SECTION_TITLE =
  "mb-3 shrink-0 text-sm font-semibold uppercase tracking-wide text-[var(--accent)]";

/** Section qui cède de la hauteur en cas de débordement. Le `flex-shrink` par
    défaut réduit chaque section proportionnellement à son contenu : la plus
    fournie perd le plus, mais aucune ne disparaît. C'est ce qui évite que
    trente matchs à venir enterrent « Derniers résultats » hors de vue. */
const SECTION = "flex min-h-0 flex-col";

/** Zone qui défile, autour de la liste elle-même : la barre reste alors dans la
    section et non le long de toute la colonne.
    Le plancher vaut une ligne de match pleine. Sans lui, le partage
    proportionnel réduisait « Matchs à venir » à 71 px face à vingt-huit
    résultats — une ligne coupée en deux, qui se lit comme un bug d'affichage.
    Il reste sous la hauteur minimale de la colonne, donc deux sections au
    plancher ne débordent jamais. */
const SECTION_SCROLL = "scroll-accent min-h-[6.5rem] overflow-y-auto rounded-lg";

/**
 * Colonne latérale « Matchs à venir / Derniers résultats », partagée par la fiche
 * équipe, la fiche joueur et l'aperçu d'un tournoi.
 *
 * Une section vide n'est affichée que si l'autre l'est aussi : sur une équipe qui
 * a des résultats mais plus rien au calendrier, « Aucun match à venir » n'apprend
 * rien et pousse le vrai contenu vers le bas. Quand les deux sont vides, on garde
 * un seul message plutôt que deux.
 *
 * La colonne ne tronque plus à quatre lignes : elle prend la hauteur du contenu
 * voisin, et chaque section défile dans ce qui lui revient. D'où l'enfant hors
 * flux à partir de `lg` — un enfant en `absolute` ne pèse rien dans le calcul de
 * la rangée de grille, donc c'est la colonne de droite qui la dimensionne, et la
 * cellule étirée redonne cette hauteur aux listes. En le laissant dans le flux,
 * les listes dicteraient la rangée et ne défileraient jamais. Sous `lg` il n'y a
 * plus qu'une colonne, donc plus de voisin : on retombe sur un plafond exprimé
 * en hauteur d'écran, sans quoi les matchs repousseraient le contenu principal
 * plusieurs écrans plus bas.
 */
export default function MatchSideColumn({
  upcoming,
  recent,
  emptyUpcoming = "Aucun match à venir.",
  emptyRecent = "Aucun match joué.",
}: {
  upcoming: MiniMatch[];
  recent: MiniMatch[];
  emptyUpcoming?: string;
  emptyRecent?: string;
}) {
  const showUpcoming = upcoming.length > 0;
  const showRecent = recent.length > 0;

  return (
    // Le plancher `min-h` évite la boîte à défilement de deux lignes quand le
    // contenu voisin est court — une fiche joueur sans statistique, par exemple.
    <div className="relative min-w-0 lg:min-h-[20rem]">
      <div className="flex max-h-[70vh] min-h-0 flex-col gap-6 overflow-hidden lg:absolute lg:inset-0 lg:max-h-none">
        {showUpcoming && (
          <section className={SECTION}>
            <h2 className={SECTION_TITLE}>Matchs à venir</h2>
            <div className={SECTION_SCROLL}>
              <MatchMiniList matches={upcoming} empty={emptyUpcoming} />
            </div>
          </section>
        )}

        {showRecent && (
          <section className={SECTION}>
            <h2 className={SECTION_TITLE}>Derniers résultats</h2>
            <div className={SECTION_SCROLL}>
              <MatchMiniList matches={recent} empty={emptyRecent} />
            </div>
          </section>
        )}

        {!showUpcoming && !showRecent && (
          <section className={SECTION}>
            <h2 className={SECTION_TITLE}>Matchs</h2>
            <EmptyLine>Aucun match, ni joué ni programmé.</EmptyLine>
          </section>
        )}
      </div>
    </div>
  );
}

/** Vrai quand la colonne porte au moins un match — sert à décider de la grille. */
export function hasMatchColumnContent(upcoming: MiniMatch[], recent: MiniMatch[]): boolean {
  return upcoming.length > 0 || recent.length > 0;
}
