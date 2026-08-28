/**
 * Indicateurs du tableau de bord d'administration.
 *
 * Le catalogue est figé ici plutôt que construit dans la page : chaque entrée
 * porte son libellé et sa destination, et l'ordre du tableau est l'ordre
 * d'affichage.
 *
 * Chacun a été retenu **sur mesure** et non par intuition. Les candidats
 * écartés — équipes sans roster (76 sur 100), joueurs sans compte (126 sur
 * 127), matchs sans scoreboard (90 sur 246) — décrivaient le fonctionnement
 * normal d'un site alimenté par un miroir, pas une anomalie. Un compteur qui ne
 * bouge jamais est un compteur qu'on cesse de lire.
 *
 * « Équipes du miroir sans logo » montre l'importance du cadrage : toutes
 * équipes confondues il vaut 20 et ne veut rien dire, les fiches saisies à la
 * main n'ayant légitimement pas de logo. Restreint aux équipes que Riot nous
 * donne, il vaut 0 — et tout passage au-dessus signale un téléchargement
 * échoué, le défaut borné par le délai d'abandon du 2026-08-28.
 */
export const ALERTES = [
  {
    cle: "matchsASaisir",
    libelle: "Matchs passés sans résultat",
    href: "/admin/tournois?anomalie=matchs-a-saisir",
  },
  {
    cle: "sansVainqueur",
    libelle: "Matchs terminés sans vainqueur",
    href: "/admin/tournois?anomalie=sans-vainqueur",
  },
  {
    cle: "sansInscrit",
    libelle: "Tournois commencés sans inscrit",
    href: "/admin/tournois?anomalie=sans-inscrit",
  },
  {
    cle: "miroirSansLogo",
    libelle: "Équipes du miroir sans logo",
    href: "/admin/equipes?anomalie=sans-logo",
  },
  {
    cle: "miroirIncoherent",
    libelle: "Équipes du miroir sans identifiant Premier",
    href: "/admin/equipes?anomalie=miroir-incoherent",
  },
] as const;

export type CleAlerte = (typeof ALERTES)[number]["cle"];

export type AlerteAdmin = {
  cle: CleAlerte;
  libelle: string;
  href: string;
  compte: number;
};

/**
 * Les indicateurs à afficher : uniquement ceux dont le compte est strictement
 * positif, dans l'ordre du catalogue.
 *
 * Le filtre sur « strictement positif » et non « différent de zéro » n'est pas
 * de la coquetterie : aucun compte ne devrait être négatif, mais une
 * soustraction introduite plus tard pourrait en produire un, et « -2 à
 * traiter » serait pire que rien.
 */
export function alertesVisibles(comptes: Record<CleAlerte, number>): AlerteAdmin[] {
  return ALERTES.filter((a) => (comptes[a.cle] ?? 0) > 0).map((a) => ({
    cle: a.cle,
    libelle: a.libelle,
    href: a.href,
    compte: comptes[a.cle],
  }));
}
