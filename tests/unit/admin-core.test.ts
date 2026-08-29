import { describe, it, expect } from "vitest";
import { ALERTES, alertesVisibles } from "@/lib/admin-core";

const zero = {
  matchsASaisir: 0,
  sansVainqueur: 0,
  sansInscrit: 0,
  miroirSansLogo: 0,
  miroirIncoherent: 0,
  doublonsEquipes: 0,
};

describe("alertesVisibles", () => {
  it("ne rend rien quand tout est à zéro", () => {
    // C'est l'état normal du site. Un mur de zéros en tête de tableau de bord
    // n'apprend rien et fait perdre l'habitude de regarder.
    expect(alertesVisibles(zero)).toEqual([]);
  });

  it("ne rend que les indicateurs non nuls", () => {
    const vues = alertesVisibles({ ...zero, matchsASaisir: 3 });
    expect(vues).toHaveLength(1);
    expect(vues[0].cle).toBe("matchsASaisir");
    expect(vues[0].compte).toBe(3);
  });

  it("respecte l'ordre du catalogue", () => {
    const vues = alertesVisibles({ ...zero, miroirSansLogo: 1, matchsASaisir: 1 });
    expect(vues.map((a) => a.cle)).toEqual(["matchsASaisir", "miroirSansLogo"]);
  });

  it("porte le libellé et le lien du catalogue", () => {
    const vues = alertesVisibles({ ...zero, sansInscrit: 2 });
    const attendu = ALERTES.find((a) => a.cle === "sansInscrit");
    expect(vues[0].libelle).toBe(attendu?.libelle);
    expect(vues[0].href).toBe(attendu?.href);
  });

  it("traite un compte négatif comme nul", () => {
    // Aucun compte ne devrait l'être, mais une soustraction future pourrait en
    // produire un : afficher « -2 à traiter » serait pire que rien.
    expect(alertesVisibles({ ...zero, sansVainqueur: -2 })).toEqual([]);
  });
});
