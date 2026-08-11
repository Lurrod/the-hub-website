import { bestOfLabel, shareCardFilename } from "@/lib/og/labels";

/** Une carte proposée au partage : le résultat, une map, la série entière. */
export type ShareVariant = {
  key: string;
  /** Libellé de l'onglet (« Résultat », « Ascent », « Bo3 »). */
  label: string;
  /** Route qui rend cette carte. */
  imageUrl: string;
  /** Nom proposé au téléchargement. */
  filename: string;
};

type MatchShape = {
  id: string;
  bestOf: number;
  teamA: { name: string };
  teamB: { name: string };
  /** Toutes les maps du match, dans l'ordre, avec leur nombre de lignes de stats. */
  maps: readonly { mapName: string; statCount: number }[];
};

/**
 * Cartes proposées depuis une fiche de match.
 *
 * Une map sans scoreboard importé n'a rien à montrer et n'est pas proposée,
 * mais les numéros restent ceux du match : `map-2` désigne la deuxième map
 * jouée, pas la deuxième map stattée — c'est ce que la route sait valider.
 *
 * La carte de série n'apparaît qu'à partir de deux maps : sur une seule, elle
 * répéterait mot pour mot celle de la map.
 */
export function matchShareVariants(match: MatchShape): ShareVariant[] {
  const duel = [match.teamA.name, "vs", match.teamB.name];

  const maps = match.maps.flatMap((map, index) =>
    map.statCount === 0
      ? []
      : [
          {
            key: `map-${index + 1}`,
            label: map.mapName,
            imageUrl: `/matchs/${match.id}/carte?vue=map-${index + 1}`,
            filename: shareCardFilename([...duel, map.mapName]),
          },
        ]
  );

  const serie =
    maps.length > 1
      ? [
          {
            key: "serie",
            label: bestOfLabel(match.bestOf),
            imageUrl: `/matchs/${match.id}/carte?vue=serie`,
            filename: shareCardFilename([...duel, "serie"]),
          },
        ]
      : [];

  return [
    {
      key: "resume",
      label: "Résultat",
      imageUrl: `/matchs/${match.id}/carte`,
      filename: shareCardFilename(duel),
    },
    ...maps,
    ...serie,
  ];
}

/**
 * Cartes proposées depuis une fiche de joueur. Il n'y en a qu'une : le
 * sélecteur ne s'affiche pas, mais la forme reste celle du match pour que le
 * composant n'ait qu'un seul mode.
 */
export function playerShareVariants(player: { id: string; pseudo: string }): ShareVariant[] {
  return [
    {
      key: "fiche",
      label: "Fiche",
      imageUrl: `/joueurs/${player.id}/carte`,
      filename: shareCardFilename([player.pseudo]),
    },
  ];
}
