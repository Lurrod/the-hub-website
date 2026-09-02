import { describe, it, expect } from "vitest";
import { slugify, ficheSegment, fichePath, idFromSegment, isCanonicalSegment } from "@/lib/slug";

/** Forme réelle d'un identifiant Prisma en production. */
const ID = "cmsc4bkx80005hit3dn04utnp";

describe("slugify", () => {
  it("déplie les accents plutôt que de les supprimer", () => {
    // `normalize("NFD")` sépare la lettre de son accent ; retirer la plage des
    // diacritiques sans cette étape donnerait « limination ».
    expect(slugify("Élimination directe")).toBe("elimination-directe");
    expect(slugify("Coupe d'été")).toBe("coupe-d-ete");
  });

  it("réduit toute suite de caractères non alphanumériques à un tiret", () => {
    expect(slugify("Hub  —  Masters // 2026")).toBe("hub-masters-2026");
  });

  it("ne laisse pas de tiret aux extrémités", () => {
    expect(slugify("  ~Coupe~  ")).toBe("coupe");
  });

  it("coupe au mot et non au milieu d'un mot", () => {
    const long = slugify("a".repeat(30) + " " + "b".repeat(40));
    expect(long.length).toBeLessThanOrEqual(60);
    expect(long.endsWith("-")).toBe(false);
    expect(long).toBe("a".repeat(30));
  });

  it("rend une chaîne vide quand rien n'est translittérable", () => {
    expect(slugify("日本語")).toBe("");
    expect(slugify("!!!")).toBe("");
  });
});

describe("ficheSegment / fichePath", () => {
  it("préfixe l'identifiant du nom", () => {
    expect(ficheSegment(ID, "Hub Championship")).toBe(`hub-championship--${ID}`);
    expect(fichePath("tournois", ID, "Hub Championship")).toBe(`/tournois/hub-championship--${ID}`);
  });

  it("retombe sur l'identifiant nu quand le nom ne donne rien", () => {
    expect(ficheSegment(ID, null)).toBe(ID);
    expect(ficheSegment(ID, "日本語")).toBe(ID);
    expect(fichePath("joueurs", ID, "")).toBe(`/joueurs/${ID}`);
  });
});

describe("idFromSegment", () => {
  it("retrouve l'identifiant derrière un slug", () => {
    expect(idFromSegment(`hub-championship--${ID}`)).toBe(ID);
  });

  it("laisse intact un identifiant nu", () => {
    expect(idFromSegment(ID)).toBe(ID);
  });

  /**
   * Le cas qui impose de vérifier la FORME du suffixe et pas seulement sa
   * présence : les jeux de données portent des identifiants à tirets. Couper
   * au dernier tiret sans discernement les amputerait de tout sauf leur
   * dernier mot, et les 19 parcours e2e tomberaient d'un coup.
   */
  it("retrouve un identifiant qui contient lui-même des tirets", () => {
    // Le cas qui a imposé le double tiret. Une première version coupait au
    // dernier tiret simple : elle marchait en production, où tout est en
    // cuid(), et rendait le segment entier sur les jeux de données — la fiche
    // devenait introuvable et les 19 parcours e2e tombaient d'un bloc.
    expect(idFromSegment(ficheSegment("fmt-single-elim", "Hub Invitational"))).toBe(
      "fmt-single-elim"
    );
    expect(idFromSegment("hub-invitational--fmt-single-elim")).toBe("fmt-single-elim");
  });

  it("ne coupe pas un identifiant de jeu de données", () => {
    expect(idFromSegment("fmt-single-elim")).toBe("fmt-single-elim");
    expect(idFromSegment("fx-team-a")).toBe("fx-team-a");
    expect(idFromSegment("fmt-groups-elim-m-a-1")).toBe("fmt-groups-elim-m-a-1");
  });

  it("supporte un slug qui contient lui-même des tirets", () => {
    expect(idFromSegment(`hub-masters-double-elimination--${ID}`)).toBe(ID);
  });

  it("fait l'aller-retour pour n'importe quel nom", () => {
    for (const nom of ["Hub Championship", "Élimination directe", "日本語", "", "a-b-c"]) {
      expect(idFromSegment(ficheSegment(ID, nom))).toBe(ID);
    }
  });
});

describe("isCanonicalSegment", () => {
  it("reconnaît la forme à jour", () => {
    expect(isCanonicalSegment(`hub-championship--${ID}`, ID, "Hub Championship")).toBe(true);
  });

  it("refuse l'identifiant nu quand un nom existe", () => {
    expect(isCanonicalSegment(ID, ID, "Hub Championship")).toBe(false);
  });

  // Un organisateur corrige une faute dans le nom : l'ancienne URL continue de
  // résoudre, et c'est la redirection qui ramène vers la forme à jour.
  it("refuse un slug périmé", () => {
    expect(isCanonicalSegment(`hub-champoinship--${ID}`, ID, "Hub Championship")).toBe(false);
  });

  it("accepte l'identifiant nu quand le nom ne donne aucun slug", () => {
    expect(isCanonicalSegment(ID, ID, "日本語")).toBe(true);
  });
});
