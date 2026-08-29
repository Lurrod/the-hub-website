import { describe, it, expect } from "vitest";
import { repartirLignes } from "@/lib/match-column-core";

describe("repartirLignes", () => {
  it("rend tout quand la place suffit", () => {
    expect(repartirLignes(10, [3, 4])).toEqual([3, 4]);
  });

  it("ne rend rien quand il n'y a la place pour rien", () => {
    expect(repartirLignes(0, [3, 4])).toEqual([0, 0]);
  });

  it("donne une ligne à chaque section avant d'en donner deux à une seule", () => {
    // Une section réduite à son seul titre n'apprend rien et occupe quand même
    // la place : mieux vaut une ligne partout qu'aucune quelque part.
    expect(repartirLignes(2, [20, 3])).toEqual([1, 1]);
  });

  it("partage à parts égales tant que les deux sections en demandent", () => {
    // Sept matchs à venir contre vingt-huit résultats, huit lignes de place :
    // quatre et quatre. Un prorata strict n'en donnerait qu'un ou deux aux
    // matchs à venir, alors qu'ils tiennent pour le même prix — et c'est le
    // quatre-quatre que la colonne montrait avant qu'on lève le plafond.
    expect(repartirLignes(8, [7, 28])).toEqual([4, 4]);
  });

  it("ne donne jamais plus que ce que la section contient", () => {
    // Deux à venir, trente résultats, vingt lignes de place : les deux premiers
    // ne doivent pas se voir attribuer une place qu'ils ne rempliront pas.
    const parts = repartirLignes(20, [2, 30]);
    expect(parts[0]).toBe(2);
    expect(parts[1]).toBe(18);
  });

  it("ignore une section vide", () => {
    expect(repartirLignes(5, [0, 12])).toEqual([0, 5]);
  });

  it("ne rend pas de part négative sur une taille aberrante", () => {
    // Aucun appelant ne devrait passer un négatif, mais un calcul de hauteur
    // qui déraille en produirait un, et une part négative ferait planter le
    // `slice` de la liste.
    expect(repartirLignes(5, [-3, 4])).toEqual([0, 4]);
  });

  it("borne un total plus grand que tout le contenu", () => {
    expect(repartirLignes(100, [2, 3])).toEqual([2, 3]);
  });
});
