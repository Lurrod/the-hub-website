import { describe, it, expect } from "vitest";
import {
  bestOfLabel,
  dateRangeLabel,
  mapDiffLabel,
  mapsLabel,
  matchBadge,
  metaLine,
  monogram,
  recordLabel,
  scoreLabel,
  teamCountLabel,
  tournamentBadge,
} from "@/lib/og/labels";

describe("dateRangeLabel", () => {
  const debut = new Date("2026-08-12T00:00:00.000Z");
  const fin = new Date("2026-08-19T00:00:00.000Z");

  it("relie les deux dates", () => {
    expect(dateRangeLabel(debut, fin)).toBe("12 – 19 août 2026");
  });

  it("n'affiche qu'une date quand elles sont identiques", () => {
    expect(dateRangeLabel(debut, debut)).toBe("12 août 2026");
  });

  it("garde les deux mois quand ils diffèrent", () => {
    expect(dateRangeLabel(debut, new Date("2026-09-02T00:00:00.000Z"))).toBe(
      "12 août – 2 septembre 2026"
    );
  });

  it("tombe sur la seule date connue", () => {
    expect(dateRangeLabel(debut, null)).toBe("12 août 2026");
    expect(dateRangeLabel(null, fin)).toBe("19 août 2026");
  });

  it("renvoie une chaîne vide sans aucune date", () => {
    expect(dateRangeLabel(null, null)).toBe("");
  });
});

describe("teamCountLabel", () => {
  it("montre la limite quand elle existe", () => {
    expect(teamCountLabel(12, 16)).toBe("12/16 équipes");
  });

  it("omet la limite quand il n'y en a pas", () => {
    expect(teamCountLabel(12, null)).toBe("12 équipes");
  });

  it("accorde le singulier", () => {
    expect(teamCountLabel(1, null)).toBe("1 équipe");
  });

  it("accorde sur la limite, pas sur le nombre d'inscrits", () => {
    expect(teamCountLabel(0, 16)).toBe("0/16 équipes");
    expect(teamCountLabel(1, 16)).toBe("1/16 équipes");
  });

  it("accorde le singulier sur zéro sans limite", () => {
    expect(teamCountLabel(0, null)).toBe("0 équipe");
  });
});

describe("bestOfLabel", () => {
  it("formate le nombre de maps", () => {
    expect(bestOfLabel(3)).toBe("Bo3");
  });
});

describe("scoreLabel", () => {
  it("sépare les scores par un tiret demi-cadratin", () => {
    expect(scoreLabel(2, 1)).toBe("2 – 1");
  });
});

describe("mapsLabel", () => {
  it("liste les maps et leurs scores", () => {
    expect(
      mapsLabel([
        { mapName: "Ascent", scoreA: 13, scoreB: 9 },
        { mapName: "Bind", scoreA: 8, scoreB: 13 },
      ])
    ).toBe("Ascent 13-9 · Bind 8-13");
  });

  it("renvoie une chaîne vide sans map", () => {
    expect(mapsLabel([])).toBe("");
  });
});

describe("recordLabel", () => {
  it("assemble bilan et winrate", () => {
    expect(recordLabel({ played: 11, wins: 8, losses: 3, winrate: 73 })).toBe("8V – 3D · 73%");
  });

  it("renvoie une chaîne vide sans match joué", () => {
    expect(recordLabel({ played: 0, wins: 0, losses: 0, winrate: 0 })).toBe("");
  });
});

describe("mapDiffLabel", () => {
  it("signe les différences positives", () => {
    expect(mapDiffLabel(7)).toBe("+7");
  });

  it("garde le signe des différences négatives", () => {
    expect(mapDiffLabel(-3)).toBe("-3");
  });

  it("n'ajoute pas de signe à zéro", () => {
    expect(mapDiffLabel(0)).toBe("0");
  });
});

describe("monogram", () => {
  it("prend la première lettre en majuscule", () => {
    expect(monogram("Karmine Corp")).toBe("K");
  });

  it("translittère les accents", () => {
    expect(monogram("Élan")).toBe("E");
  });

  it("saute la ponctuation initiale", () => {
    expect(monogram("!!! Team")).toBe("T");
  });

  it("accepte un chiffre initial", () => {
    expect(monogram("4Merical")).toBe("4");
  });

  it("retombe sur un point d'interrogation", () => {
    expect(monogram("")).toBe("?");
    expect(monogram("···")).toBe("?");
  });
});

describe("metaLine", () => {
  it("écarte les segments vides", () => {
    expect(metaLine(["Double élimination", null, "France", "", undefined])).toBe(
      "Double élimination · France"
    );
  });

  it("renvoie une chaîne vide quand tout est vide", () => {
    expect(metaLine([null, "", undefined])).toBe("");
  });
});

describe("tournamentBadge", () => {
  it("suffixe le statut sauf pour un tournoi à venir", () => {
    expect(tournamentBadge("ONGOING")).toBe("TOURNOI · EN COURS");
    expect(tournamentBadge("FINISHED")).toBe("TOURNOI · TERMINÉ");
    expect(tournamentBadge("UPCOMING")).toBe("TOURNOI");
  });
});

describe("matchBadge", () => {
  it("suffixe le statut sauf pour un match programmé", () => {
    expect(matchBadge("LIVE")).toBe("MATCH · EN DIRECT");
    expect(matchBadge("FINISHED")).toBe("MATCH · TERMINÉ");
    expect(matchBadge("SCHEDULED")).toBe("MATCH");
  });
});
