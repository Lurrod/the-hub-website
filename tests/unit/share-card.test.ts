import { describe, it, expect } from "vitest";
import { agentsLabel, mvpLabel, shareCardFilename, statGridValues } from "@/lib/og/labels";

describe("shareCardFilename", () => {
  it("assemble les segments derrière le préfixe du site", () => {
    expect(shareCardFilename(["NAVI", "vs", "Karmine Corp"])).toBe(
      "the-hub-navi-vs-karmine-corp.png"
    );
  });

  it("retire les accents au lieu de les remplacer par un tiret", () => {
    expect(shareCardFilename(["Équipe Élan"])).toBe("the-hub-equipe-elan.png");
  });

  it("fusionne la ponctuation et les espaces multiples en un seul tiret", () => {
    expect(shareCardFilename(["G2   Gozen !!", "vs", "M8"])).toBe("the-hub-g2-gozen-vs-m8.png");
  });

  it("ne laisse pas de tiret en tête ni en queue", () => {
    expect(shareCardFilename(["--- Sh1n ---"])).toBe("the-hub-sh1n.png");
  });

  it("garde les chiffres du pseudo", () => {
    expect(shareCardFilename(["Sh1n"])).toBe("the-hub-sh1n.png");
  });

  it("retombe sur le seul préfixe quand rien n'est exploitable", () => {
    expect(shareCardFilename(["", "***"])).toBe("the-hub.png");
  });
});

describe("mvpLabel", () => {
  const stat = (pseudo: string | null, rating: number, acs: number, riotName = "Joueur#EUW") => ({
    pseudo,
    riotName,
    rating,
    acs,
  });

  it("retient la meilleure note de la rencontre", () => {
    expect(mvpLabel([stat("Sh1n", 1.42, 312), stat("Nivera", 1.11, 240)])).toBe(
      "Sh1n · 1.42 rating · 312 ACS"
    );
  });

  it("compare toutes les maps, pas seulement la première", () => {
    expect(mvpLabel([stat("Nivera", 1.11, 240), stat("Sh1n", 1.42, 312)])).toBe(
      "Sh1n · 1.42 rating · 312 ACS"
    );
  });

  it("garde le premier nommé en cas d'égalité", () => {
    expect(mvpLabel([stat("Nivera", 1.3, 260), stat("Sh1n", 1.3, 299)])).toBe(
      "Nivera · 1.30 rating · 260 ACS"
    );
  });

  it("tombe sur le Riot ID quand le joueur n'a pas de fiche", () => {
    expect(mvpLabel([stat(null, 1.42, 312, "Sh1n#EUW")])).toBe("Sh1n · 1.42 rating · 312 ACS");
  });

  it("arrondit l'ACS et fixe deux décimales au rating", () => {
    expect(mvpLabel([stat("Sh1n", 1.4, 311.6)])).toBe("Sh1n · 1.40 rating · 312 ACS");
  });

  it("renvoie une chaîne vide sans aucune statistique", () => {
    expect(mvpLabel([])).toBe("");
  });
});

describe("agentsLabel", () => {
  it("aligne les trois agents les plus joués", () => {
    expect(
      agentsLabel([
        { agent: "Jett", pct: 41 },
        { agent: "Raze", pct: 33 },
        { agent: "Neon", pct: 12 },
      ])
    ).toBe("Jett 41% · Raze 33% · Neon 12%");
  });

  it("s'arrête à trois même quand la liste est plus longue", () => {
    expect(
      agentsLabel([
        { agent: "Jett", pct: 41 },
        { agent: "Raze", pct: 33 },
        { agent: "Neon", pct: 12 },
        { agent: "Yoru", pct: 8 },
      ])
    ).toBe("Jett 41% · Raze 33% · Neon 12%");
  });

  it("accepte une liste plus courte", () => {
    expect(agentsLabel([{ agent: "Jett", pct: 100 }])).toBe("Jett 100%");
  });

  it("arrondit les parts", () => {
    expect(agentsLabel([{ agent: "Jett", pct: 41.6 }])).toBe("Jett 42%");
  });

  it("renvoie une chaîne vide sans agent", () => {
    expect(agentsLabel([])).toBe("");
  });
});

describe("statGridValues", () => {
  const overview = {
    avgRating: 1.183,
    avgAcs: 240.6,
    kd: 1.337,
    avgKast: 73.8,
    avgHs: 27.5,
    maps: 126,
  };

  it("rend les six cases dans l'ordre de lecture", () => {
    expect(statGridValues(overview)).toEqual([
      { value: "1.18", label: "RATING" },
      { value: "241", label: "ACS" },
      { value: "1.34", label: "K/D" },
      { value: "74%", label: "KAST" },
      { value: "28%", label: "HS" },
      { value: "126", label: "MAPS" },
    ]);
  });

  it("renvoie une grille vide pour un joueur sans map", () => {
    expect(statGridValues({ ...overview, maps: 0 })).toEqual([]);
  });
});
