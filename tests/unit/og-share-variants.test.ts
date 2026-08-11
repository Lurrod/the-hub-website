import { describe, it, expect } from "vitest";
import { matchShareVariants, playerShareVariants } from "@/lib/og/share-variants";

const match = (maps: { mapName: string; statCount: number }[], bestOf = 3) => ({
  id: "m1",
  bestOf,
  teamA: { name: "NAVI" },
  teamB: { name: "Karmine Corp" },
  maps,
});

describe("matchShareVariants", () => {
  it("ne propose que le résultat quand aucun scoreboard n'est importé", () => {
    const variants = matchShareVariants(match([{ mapName: "Ascent", statCount: 0 }]));
    expect(variants).toEqual([
      {
        key: "resume",
        label: "Résultat",
        imageUrl: "/matchs/m1/carte",
        filename: "the-hub-navi-vs-karmine-corp.png",
      },
    ]);
  });

  it("ajoute une carte par map dont les statistiques existent", () => {
    const variants = matchShareVariants(
      match([
        { mapName: "Ascent", statCount: 10 },
        { mapName: "Bind", statCount: 10 },
      ])
    );
    expect(variants.map((v) => v.key)).toEqual(["resume", "map-1", "map-2", "serie"]);
    expect(variants[1]).toEqual({
      key: "map-1",
      label: "Ascent",
      imageUrl: "/matchs/m1/carte?vue=map-1",
      filename: "the-hub-navi-vs-karmine-corp-ascent.png",
    });
  });

  it("numérote les maps sur leur rang réel, pas sur celui des maps stattées", () => {
    const variants = matchShareVariants(
      match([
        { mapName: "Ascent", statCount: 0 },
        { mapName: "Bind", statCount: 10 },
      ])
    );
    expect(variants.map((v) => v.key)).toEqual(["resume", "map-2"]);
  });

  it("n'ajoute la carte de série qu'à partir de deux maps stattées", () => {
    const une = matchShareVariants(match([{ mapName: "Ascent", statCount: 10 }]));
    expect(une.map((v) => v.key)).toEqual(["resume", "map-1"]);
  });

  it("nomme la carte de série d'après le format du match", () => {
    const variants = matchShareVariants(
      match(
        [
          { mapName: "Ascent", statCount: 10 },
          { mapName: "Bind", statCount: 10 },
          { mapName: "Lotus", statCount: 10 },
        ],
        5
      )
    );
    const serie = variants.at(-1);
    expect(serie).toEqual({
      key: "serie",
      label: "Bo5",
      imageUrl: "/matchs/m1/carte?vue=serie",
      filename: "the-hub-navi-vs-karmine-corp-serie.png",
    });
  });

  it("accepte un match sans map", () => {
    expect(matchShareVariants(match([])).map((v) => v.key)).toEqual(["resume"]);
  });
});

describe("playerShareVariants", () => {
  it("ne propose qu'une carte, donc aucun sélecteur", () => {
    expect(playerShareVariants({ id: "p1", pseudo: "Sh1n" })).toEqual([
      {
        key: "fiche",
        label: "Fiche",
        imageUrl: "/joueurs/p1/carte",
        filename: "the-hub-sh1n.png",
      },
    ]);
  });
});
