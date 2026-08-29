import { describe, it, expect } from "vitest";
import {
  normaliserLibelle,
  chercherDoublons,
  clePaire,
  relirePaire,
  type EquipeRapprochable,
} from "@/lib/doublons-equipes-core";

/** Fiche minimale : les compteurs à zéro sauf mention contraire. */
function equipe(over: Partial<EquipeRapprochable> & { id: string; name: string; tag: string }) {
  return {
    matchs: 0,
    membres: 0,
    managers: 0,
    inscriptions: 0,
    ...over,
  } as EquipeRapprochable;
}

describe("normaliserLibelle", () => {
  it("ignore la casse, les accents et la ponctuation", () => {
    // Les trois écarts observés en production le 2026-08-29 : « Orphée » contre
    // « Orphee », « ORIGIN PURPLE » contre « Origin Purple », « Origin's Omega »
    // contre « ORIGINS OMEGA ».
    expect(normaliserLibelle("Orphée Esport")).toBe("orpheeesport");
    expect(normaliserLibelle("ORIGIN PURPLE")).toBe(normaliserLibelle("Origin Purple"));
    expect(normaliserLibelle("Origin's Omega")).toBe("originsomega");
  });

  it("rend une chaîne vide pour un libellé sans caractère alphanumérique", () => {
    expect(normaliserLibelle("---")).toBe("");
  });
});

describe("chercherDoublons", () => {
  const miroir = equipe({ id: "p1", name: "AZRising", tag: "AZR", matchs: 2 });
  const main = equipe({ id: "m1", name: "AZ Rising", tag: "AZR", matchs: 1, inscriptions: 1 });

  it("rapproche sur le nom et le tag normalisés", () => {
    const paires = chercherDoublons([miroir], [main]);
    expect(paires).toHaveLength(1);
    expect(paires[0].miroir.id).toBe("p1");
    expect(paires[0].manuelle.id).toBe("m1");
    expect(paires[0].confiance).toBe("sure");
  });

  it("distingue le rapprochement par nom seul", () => {
    // Brezelit en production : même nom, tag BZL contre BZLT.
    const paires = chercherDoublons(
      [equipe({ id: "p", name: "Brezelit", tag: "BZL" })],
      [equipe({ id: "m", name: "Brezelit", tag: "BZLT" })]
    );
    expect(paires[0].confiance).toBe("probable");
  });

  it("voit à travers un suffixe de structure", () => {
    // « HL Tauri » côté Riot contre « HL Tauri eSports » côté saisie. Le tag
    // concorde et le nom ne diffère que du suffixe : c'est la même équipe, et
    // la laisser en « à vérifier » la noierait parmi les faux positifs.
    const paires = chercherDoublons(
      [equipe({ id: "p", name: "HL Tauri", tag: "HLT" })],
      [equipe({ id: "m", name: "HL Tauri eSports", tag: "HLT" })]
    );
    expect(paires[0].confiance).toBe("sure");
  });

  it("voit à travers une faute de frappe d'un caractère", () => {
    // Les deux observées en production : « SilentAscencion » pour
    // « SilentAscension », « Ouf of Fame » pour « Out of Fame ».
    const paires = chercherDoublons(
      [
        equipe({ id: "p1", name: "SilentAscension", tag: "SA" }),
        equipe({ id: "p2", name: "Out of Fame", tag: "OOF" }),
      ],
      [
        equipe({ id: "m1", name: "SilentAscencion", tag: "SA" }),
        equipe({ id: "m2", name: "Ouf of Fame", tag: "OOF" }),
      ]
    );
    expect(paires.map((p) => p.confiance)).toEqual(["sure", "sure"]);
  });

  it("ne confond pas une équipe B avec son équipe principale", () => {
    // Le garde-fou des deux règles ci-dessus : « arkad » est bien un préfixe de
    // « arkadb2 », mais « b2 » désigne un second effectif, pas une structure.
    // Deux caractères d'écart, et « b2 » n'est pas un suffixe de structure.
    const paires = chercherDoublons(
      [equipe({ id: "p", name: "ARKAD", tag: "ARK" })],
      [equipe({ id: "m", name: "ARKAD B2", tag: "ARK" })]
    );
    expect(paires[0].confiance).toBe("a-verifier");
  });

  it("ne confond pas deux squads d'une même structure", () => {
    // « ORIGINS ALPHA » et « Origin's Omega » partagent le tag ORG sans être la
    // même équipe. Idem « PCS NEPTUNE » et « PCS Nova ».
    const paires = chercherDoublons(
      [
        equipe({ id: "p1", name: "ORIGINS ALPHA", tag: "ORG" }),
        equipe({ id: "p2", name: "PCS NEPTUNE", tag: "PCS" }),
      ],
      [
        equipe({ id: "m1", name: "Origin's Omega", tag: "ORG" }),
        equipe({ id: "m2", name: "PCS Nova", tag: "PCS" }),
      ]
    );
    expect(paires.every((p) => p.confiance === "a-verifier")).toBe(true);
  });

  it("distingue le rapprochement par tag seul", () => {
    // PCS NEPTUNE contre PCS Nova : deux squads d'une même structure, que seul
    // le tag rapproche. C'est le cas qui demande un œil humain.
    const paires = chercherDoublons(
      [equipe({ id: "p", name: "PCS NEPTUNE", tag: "PCS" })],
      [equipe({ id: "m", name: "PCS Nova", tag: "PCS" })]
    );
    expect(paires[0].confiance).toBe("a-verifier");
  });

  it("ne rapproche rien quand ni le nom ni le tag ne concordent", () => {
    const paires = chercherDoublons(
      [equipe({ id: "p", name: "Heartless", tag: "HL" })],
      [equipe({ id: "m", name: "RB Corp", tag: "RB" })]
    );
    expect(paires).toEqual([]);
  });

  it("signale le tag porté par plusieurs équipes du même côté", () => {
    // ARKAD et ARKAD B2 partagent le tag ARK côté miroir : le rapprochement par
    // tag y est un faux positif, l'équipe principale n'est pas son équipe B.
    const paires = chercherDoublons(
      [
        equipe({ id: "p1", name: "ARKAD", tag: "ARK" }),
        equipe({ id: "p2", name: "ARKAD B2", tag: "ARK" }),
      ],
      [equipe({ id: "m", name: "ARKAD B2", tag: "ARK" })]
    );
    const parNom = paires.find((p) => p.miroir.id === "p2");
    const parTag = paires.find((p) => p.miroir.id === "p1");
    expect(parNom?.confiance).toBe("sure");
    expect(parNom?.tagAmbigu).toBe(true);
    expect(parTag?.confiance).toBe("a-verifier");
    expect(parTag?.tagAmbigu).toBe(true);
  });

  it("classe les paires les plus sûres d'abord", () => {
    const paires = chercherDoublons(
      [
        equipe({ id: "pt", name: "PCS NEPTUNE", tag: "PCS" }),
        equipe({ id: "ps", name: "NoCorp", tag: "NC" }),
      ],
      [
        equipe({ id: "mt", name: "PCS Nova", tag: "PCS" }),
        equipe({ id: "ms", name: "NoCorp", tag: "NC" }),
      ]
    );
    expect(paires.map((p) => p.confiance)).toEqual(["sure", "a-verifier"]);
  });

  it("classe les paires les plus lourdes d'abord à confiance égale", () => {
    // Ce qui est en jeu décide de l'ordre : une fiche qui porte trois joueurs
    // et deux managers mérite d'être traitée avant une coquille vide.
    const paires = chercherDoublons(
      [
        equipe({ id: "p1", name: "Vide", tag: "VD" }),
        equipe({ id: "p2", name: "Peuplee", tag: "PP" }),
      ],
      [
        equipe({ id: "m1", name: "Vide", tag: "VD" }),
        equipe({ id: "m2", name: "Peuplee", tag: "PP", membres: 3, managers: 2 }),
      ]
    );
    expect(paires.map((p) => p.miroir.id)).toEqual(["p2", "p1"]);
  });

  it("écarte les paires déjà ignorées", () => {
    const paires = chercherDoublons([miroir], [main], [clePaire("p1", "m1")]);
    expect(paires).toEqual([]);
  });

  it("n'écarte que la paire ignorée, pas les autres du même côté", () => {
    const autre = equipe({ id: "m2", name: "AZRising", tag: "AZR" });
    const paires = chercherDoublons([miroir], [main, autre], [clePaire("p1", "m1")]);
    expect(paires.map((p) => p.manuelle.id)).toEqual(["m2"]);
  });

  it("rend une paire par couple, sans doublonner un rapprochement nom + tag", () => {
    const paires = chercherDoublons([miroir], [main]);
    expect(paires).toHaveLength(1);
  });
});

describe("relirePaire", () => {
  it("relit une clé produite par clePaire", () => {
    expect(relirePaire(clePaire("p1", "m1"))).toEqual({ miroirId: "p1", manuelleId: "m1" });
  });

  it("refuse une clé malformée plutôt que de lever", () => {
    // Les clés viennent de cases à cocher, donc du client. Une valeur bricolée
    // ne doit pas faire échouer tout le lot préparé.
    expect(relirePaire("sans-deux-points")).toBeNull();
    expect(relirePaire("a:b:c")).toBeNull();
    expect(relirePaire(":m1")).toBeNull();
    expect(relirePaire("p1:")).toBeNull();
  });

  it("refuse une fiche rapprochée d'elle-même", () => {
    // Écarter ou fusionner une fiche avec elle-même n'a pas de sens et, côté
    // fusion, la supprimerait après lui avoir déplacé ses propres matchs.
    expect(relirePaire("p1:p1")).toBeNull();
  });
});
