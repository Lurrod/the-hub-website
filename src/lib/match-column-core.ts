/**
 * Répartition des lignes de la colonne latérale de matchs entre ses sections.
 *
 * La colonne ne défile pas : elle prend la hauteur du contenu voisin et
 * n'affiche que ce qui y tient entier. Décider *combien* de lignes chaque
 * section reçoit est le seul calcul de cet écran, et il n'a besoin ni du DOM ni
 * de la base — il vit donc ici, où il se teste.
 *
 * La règle est un partage à parts égales, tour par tour, chaque section
 * rassasiée libérant sa place pour les autres.
 *
 * Le prorata du contenu a été essayé et écarté : avec deux matchs à venir face
 * à trente résultats et vingt lignes de place, il refusait le second « à venir »
 * pour offrir un dix-neuvième résultat. Une section courte se montre en entier
 * pour presque rien, et c'est ce qu'on veut. À parts égales, sept à venir contre
 * vingt-huit résultats sur huit lignes redonnent quatre et quatre — exactement
 * ce que la colonne montrait avant qu'on lève le plafond de quatre.
 */

/**
 * Combien de lignes montrer par section.
 *
 * @param total nombre de lignes qui tiennent dans la colonne, toutes sections
 *   confondues
 * @param tailles nombre de matchs disponibles par section
 * @returns une part par section, jamais négative ni supérieure à sa taille
 */
export function repartirLignes(total: number, tailles: readonly number[]): number[] {
  // Une taille négative ne devrait pas arriver, mais un calcul de hauteur qui
  // déraille en produirait une, et une part négative ferait planter le `slice`
  // de la liste appelante.
  const utiles = tailles.map((t) => Math.max(0, Math.floor(t)));
  if (total <= 0) return utiles.map(() => 0);

  const parts = utiles.map(() => 0);
  let reste = total;

  // Un tour donne une ligne à chaque section qui en demande encore. Dès qu'une
  // section a tout montré, elle sort d'elle-même du partage et le reste va aux
  // autres. `serviAuMoinsUne` arrête la boucle quand plus personne ne demande,
  // ce qui couvre aussi le cas où la place excède tout le contenu.
  let serviAuMoinsUne = true;
  while (reste > 0 && serviAuMoinsUne) {
    serviAuMoinsUne = false;
    for (let i = 0; i < utiles.length && reste > 0; i++) {
      if (parts[i] >= utiles[i]) continue;
      parts[i]++;
      reste--;
      serviAuMoinsUne = true;
    }
  }

  return parts;
}
