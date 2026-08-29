"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { EmptyLine } from "@/components/empty-state";
import MatchMiniList, { type MiniMatch } from "@/components/match-mini-list";
import { repartirLignes } from "@/lib/match-column-core";

/** Écart entre deux sections, en pixels : le `gap-6` de la boîte. */
const ECART = 24;

/** Marge sous un titre de section, en pixels : son `mb-3`. */
const SOUS_TITRE = 12;

/**
 * Marge de sécurité au bas de la colonne, en pixels.
 *
 * `Math.floor` garantit déjà qu'aucune ligne ne dépasse. Ces quelques pixels
 * couvrent ce que l'arithmétique ne voit pas : une police qui se substitue après
 * la mesure et rend les lignes d'un cheveu plus hautes. Une marge en pixels et
 * non une ligne entière — retirer une ligne complète laissait cent trente pixels
 * de vide au bas d'une fiche équipe.
 */
const MARGE = 4;

/** Part de la hauteur d'écran que prend la colonne quand elle n'a plus de voisin. */
const PART_ECRAN = 0.7;

const SECTION_TITLE =
  "mb-3 shrink-0 text-sm font-semibold uppercase tracking-wide text-[var(--accent)]";

/**
 * Colonne latérale « Matchs à venir / Derniers résultats », partagée par la fiche
 * équipe, la fiche joueur et l'aperçu d'un tournoi.
 *
 * Une section vide n'est affichée que si l'autre l'est aussi : sur une équipe qui
 * a des résultats mais plus rien au calendrier, « Aucun match à venir » n'apprend
 * rien et pousse le vrai contenu vers le bas. Quand les deux sont vides, on garde
 * un seul message plutôt que deux.
 *
 * **La colonne ne défile pas et ne déborde pas.** Elle prend la hauteur du
 * contenu voisin et n'affiche que les lignes qui y tiennent *entières* — une de
 * moins que ce qui rentrerait au calcul, pour qu'un chargement de police tardif
 * ou un zoom ne coupe pas la dernière. Le reste n'est pas caché derrière une
 * barre de défilement, il est simplement ailleurs : l'onglet Matchs porte la
 * liste complète.
 *
 * D'où le calcul côté client, qui est le seul moyen de connaître la hauteur
 * réellement disponible. Il est stable et ne boucle pas, parce que la boîte est
 * hors flux à partir de `lg` : sa hauteur vient de la colonne de droite et ne
 * dépend pas de ce qu'on y met. Le nombre de sections est lu dans les données et
 * non dans le DOM, pour la même raison — le déduire du rendu ferait varier le
 * budget à chaque passe.
 *
 * Sous `lg` il n'y a plus de voisin : on retombe sur un plafond en hauteur
 * d'écran, sans quoi les matchs repousseraient le contenu principal plusieurs
 * écrans plus bas.
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
  const boiteRef = useRef<HTMLDivElement>(null);
  // `null` tant qu'on n'a pas mesuré : le premier rendu, celui du serveur,
  // montre tout et la boîte le rogne. La mesure suit à la première passe de
  // mise en page, donc avant que l'écran ne soit peint.
  const [parts, setParts] = useState<number[] | null>(null);

  const nbUpcoming = upcoming.length;
  const nbRecent = recent.length;

  useLayoutEffect(() => {
    const boite = boiteRef.current;
    if (!boite) return;

    const mesurer = () => {
      const titre = boite.querySelector("h2");
      const ligne = boite.querySelector("li");
      if (!titre || !ligne) return;

      const hLigne = ligne.getBoundingClientRect().height;
      if (hLigne <= 0) return;

      // Hors flux, la hauteur vient du voisin et ne dépend pas du contenu :
      // la mesurer est stable. Dans le flux — sous `lg`, où il n'y a plus de
      // voisin — elle en dépend, et la lire ferait boucler le calcul : moins de
      // lignes rendues, boîte plus courte, donc encore moins de lignes. Observé
      // sur mobile, où la colonne se tassait jusqu'à une ligne par section. On
      // prend alors le plafond lui-même, qui est ce que la règle CSS exprime.
      const dispo =
        getComputedStyle(boite).position === "absolute"
          ? boite.clientHeight
          : window.innerHeight * PART_ECRAN;
      if (dispo <= 0) return;

      const sections = (nbUpcoming > 0 ? 1 : 0) + (nbRecent > 0 ? 1 : 0);
      const hTitres = (titre.getBoundingClientRect().height + SOUS_TITRE) * sections;
      const budget = dispo - hTitres - ECART * Math.max(0, sections - 1) - MARGE;

      // Jamais moins d'une ligne par section : un titre suivi de rien occupe la
      // place sans rien apprendre, et sans aucune ligne au DOM on ne saurait
      // plus mesurer au redimensionnement suivant.
      const tiennent = Math.max(sections, Math.floor(budget / hLigne));
      setParts(repartirLignes(tiennent, [nbUpcoming, nbRecent]));
    };

    mesurer();
    // La hauteur suit celle du voisin : elle change au redimensionnement de la
    // fenêtre comme au dépliage d'un arbre de tournoi.
    const observateur = new ResizeObserver(mesurer);
    observateur.observe(boite);
    return () => observateur.disconnect();
  }, [nbUpcoming, nbRecent]);

  const vusUpcoming = parts ? upcoming.slice(0, parts[0]) : upcoming;
  const vusRecent = parts ? recent.slice(0, parts[1]) : recent;

  const showUpcoming = nbUpcoming > 0;
  const showRecent = nbRecent > 0;

  return (
    // Le plancher `min-h` évite la colonne écrasée à une seule ligne quand le
    // contenu voisin est court — une fiche joueur sans statistique, par exemple.
    <div className="relative min-w-0 lg:min-h-[20rem]">
      <div
        ref={boiteRef}
        className="flex max-h-[70vh] min-h-0 flex-col gap-6 overflow-hidden lg:absolute lg:inset-0 lg:max-h-none"
      >
        {showUpcoming && (
          <section className="flex min-h-0 flex-col">
            <h2 className={SECTION_TITLE}>Matchs à venir</h2>
            <MatchMiniList matches={vusUpcoming} empty={emptyUpcoming} />
          </section>
        )}

        {showRecent && (
          <section className="flex min-h-0 flex-col">
            <h2 className={SECTION_TITLE}>Derniers résultats</h2>
            <MatchMiniList matches={vusRecent} empty={emptyRecent} />
          </section>
        )}

        {!showUpcoming && !showRecent && (
          <section className="flex min-h-0 flex-col">
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
