import MatchMiniList, { type MiniMatch } from "@/components/match-mini-list";

/**
 * Colonne latérale « Matchs à venir / Derniers résultats », partagée par la fiche
 * équipe et la fiche joueur.
 *
 * Une section vide n'est affichée que si l'autre l'est aussi : sur une équipe qui
 * a des résultats mais plus rien au calendrier, « Aucun match à venir » n'apprend
 * rien et pousse le vrai contenu vers le bas. Quand les deux sont vides, on garde
 * un seul message plutôt que deux.
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
    <div className="flex flex-col gap-6 self-start">
      {showUpcoming && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
            Matchs à venir
          </h2>
          <MatchMiniList matches={upcoming} empty={emptyUpcoming} />
        </section>
      )}

      {showRecent && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
            Derniers résultats
          </h2>
          <MatchMiniList matches={recent} empty={emptyRecent} />
        </section>
      )}

      {!showUpcoming && !showRecent && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
            Matchs
          </h2>
          <p className="text-sm text-[var(--text-muted)]">Aucun match.</p>
        </section>
      )}
    </div>
  );
}

/** Vrai quand la colonne porte au moins un match — sert à décider de la grille. */
export function hasMatchColumnContent(upcoming: MiniMatch[], recent: MiniMatch[]): boolean {
  return upcoming.length > 0 || recent.length > 0;
}
