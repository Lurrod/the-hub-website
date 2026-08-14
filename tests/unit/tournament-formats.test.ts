import { describe, it, expect } from "vitest";
import {
  TOURNAMENT_FORMATS,
  TOURNAMENT_FORMAT_LABELS,
  TOURNAMENT_FORMAT_DESCRIPTIONS,
  STAGES_BY_FORMAT,
  formatAllowsGroups,
  formatUsesGroupSize,
  isPremierFormat,
} from "@/lib/constants";

describe("formats Premier", () => {
  it("expose les deux divisions", () => {
    expect(TOURNAMENT_FORMATS).toContain("PREMIER_CONTENDER");
    expect(TOURNAMENT_FORMATS).toContain("PREMIER_INVITE");
  });

  it("ne joue que des matchs de bracket", () => {
    expect(STAGES_BY_FORMAT.PREMIER_CONTENDER).toEqual(["BRACKET"]);
    expect(STAGES_BY_FORMAT.PREMIER_INVITE).toEqual(["BRACKET"]);
  });

  it("laisse le Contender porter des groupes, mais pas l'Invite", () => {
    // Les brackets parallèles du Contender sont des `Group` : « autorise les
    // groupes » ne veut plus dire « joue une phase de poules ».
    expect(formatAllowsGroups("PREMIER_CONTENDER")).toBe(true);
    expect(formatAllowsGroups("PREMIER_INVITE")).toBe(false);
  });

  it("ne propose pas de taille de poule", () => {
    expect(formatUsesGroupSize("PREMIER_CONTENDER")).toBe(false);
    expect(formatUsesGroupSize("PREMIER_INVITE")).toBe(false);
  });

  it("reconnaît les deux formats Premier, et eux seuls", () => {
    const premier = TOURNAMENT_FORMATS.filter(isPremierFormat);
    expect(premier).toEqual(["PREMIER_CONTENDER", "PREMIER_INVITE"]);
  });
});

describe("formatAllowsGroups : formats historiques", () => {
  // Le prédicat cesse d'être dérivé de STAGES_BY_FORMAT dans cette livraison :
  // ce test verrouille le fait qu'aucun format existant ne change de réponse.
  it("répond comme avant sur les sept formats d'origine", () => {
    expect(formatAllowsGroups("GROUPS")).toBe(true);
    expect(formatAllowsGroups("GROUPS_THEN_ELIM")).toBe(true);
    expect(formatAllowsGroups("SWISS")).toBe(true);
    expect(formatAllowsGroups("ROUND_ROBIN")).toBe(true);
    expect(formatAllowsGroups("LEAGUE")).toBe(true);
    expect(formatAllowsGroups("SINGLE_ELIM")).toBe(false);
    expect(formatAllowsGroups("DOUBLE_ELIM")).toBe(false);
  });
});

describe("catalogue de formats", () => {
  it("garde un libellé et une description pour chaque format", () => {
    for (const f of TOURNAMENT_FORMATS) {
      expect(TOURNAMENT_FORMAT_LABELS[f], f).toBeTruthy();
      expect(TOURNAMENT_FORMAT_DESCRIPTIONS[f], f).toBeTruthy();
    }
  });

  it("déclare au moins une phase de match par format", () => {
    for (const f of TOURNAMENT_FORMATS) {
      expect(STAGES_BY_FORMAT[f].length, f).toBeGreaterThan(0);
    }
  });

  it("laisse porter des groupes tout format qui joue une phase de poule", () => {
    // Invariant à sens unique : jouer une phase de poule implique pouvoir
    // porter des groupes, jamais l'inverse — le Premier Contender porte des
    // groupes sans jouer de poule, c'est tout l'intérêt de la liste explicite.
    // Sans ce test, un futur format à phase de poule oublié dans
    // FORMATS_WITH_GROUPS passerait sans bruit.
    for (const f of TOURNAMENT_FORMATS) {
      if (STAGES_BY_FORMAT[f].includes("GROUP")) {
        expect(formatAllowsGroups(f), f).toBe(true);
      }
    }
  });
});
