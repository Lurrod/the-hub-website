import { describe, it, expect } from "vitest";
import {
  TOURNAMENT_FORMATS,
  TOURNAMENT_FORMAT_LABELS,
  TOURNAMENT_FORMAT_DESCRIPTIONS,
  STAGES_BY_FORMAT,
  formatAllowsGroups,
  formatUsesGroupSize,
  isPremierFormat,
  formatGroupsAreBrackets,
  formatUsesSwissTiebreaks,
} from "@/lib/constants";

describe("formats Premier", () => {
  it("expose les deux divisions", () => {
    expect(TOURNAMENT_FORMATS).toContain("PREMIER_CONTENDER");
    expect(TOURNAMENT_FORMATS).toContain("PREMIER_INVITE");
  });

  it("joue la ligne régulière puis les playoffs", () => {
    // Une saison Premier tient dans un seul tournoi : les deux phases vivaient
    // dans deux tournois séparés, ce qui obligeait à quitter la page pour
    // passer du classement à l'arbre.
    expect(STAGES_BY_FORMAT.PREMIER_CONTENDER).toEqual(["GROUP", "BRACKET"]);
    expect(STAGES_BY_FORMAT.PREMIER_INVITE).toEqual(["GROUP", "BRACKET"]);
  });

  it("ne traite en brackets que les groupes du Contender", () => {
    // L'Invite n'a qu'un arbre : ses `Group`, s'il en portait, seraient des
    // poules. Le prédicat ne doit pas s'étendre au second format Premier.
    expect(formatGroupsAreBrackets("PREMIER_CONTENDER")).toBe(true);
    expect(formatGroupsAreBrackets("PREMIER_INVITE")).toBe(false);
    expect(formatGroupsAreBrackets("GROUPS")).toBe(false);
    expect(formatGroupsAreBrackets("LEAGUE")).toBe(false);
  });

  it("laisse les deux formats Premier porter des groupes", () => {
    // Ils n'y mettent pas la même chose : les `Group` du Contender sont ses
    // brackets parallèles, ceux de l'Invite seraient des poules. « Autorise les
    // groupes » ne dit donc toujours pas « joue une phase de poules ».
    expect(formatAllowsGroups("PREMIER_CONTENDER")).toBe(true);
    expect(formatAllowsGroups("PREMIER_INVITE")).toBe(true);
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

describe("formats Spike Tour", () => {
  it("expose les deux étapes du circuit", () => {
    expect(TOURNAMENT_FORMATS).toContain("SPIKE_TOUR_QUALIFIER");
    expect(TOURNAMENT_FORMATS).toContain("SPIKE_TOUR_PLAYOFFS");
  });

  it("fait jouer au qualifier la ronde suisse puis l'arbre Radiant", () => {
    // Les deux journées d'un Open Qualifier tiennent dans un seul tournoi : la
    // ronde suisse du samedi en stage GROUP, l'arbre Radiant du dimanche en
    // BRACKET. Les séparer couperait le classement de l'arbre qu'il alimente.
    expect(STAGES_BY_FORMAT.SPIKE_TOUR_QUALIFIER).toEqual(["GROUP", "BRACKET"]);
    expect(STAGES_BY_FORMAT.SPIKE_TOUR_PLAYOFFS).toEqual(["BRACKET"]);
  });

  it("n'autorise les groupes que sur le qualifier", () => {
    expect(formatAllowsGroups("SPIKE_TOUR_QUALIFIER")).toBe(true);
    expect(formatAllowsGroups("SPIKE_TOUR_PLAYOFFS")).toBe(false);
  });

  it("ne prend pas ses groupes pour des brackets", () => {
    // Le Premier Contender est le seul format dans ce cas : le qualifier ne
    // doit pas hériter de son rendu.
    expect(formatGroupsAreBrackets("SPIKE_TOUR_QUALIFIER")).toBe(false);
    expect(formatGroupsAreBrackets("SPIKE_TOUR_PLAYOFFS")).toBe(false);
  });

  it("ne propose pas de taille de poule", () => {
    expect(formatUsesGroupSize("SPIKE_TOUR_QUALIFIER")).toBe(false);
    expect(formatUsesGroupSize("SPIKE_TOUR_PLAYOFFS")).toBe(false);
  });

  it("n'est pas un format Premier", () => {
    expect(isPremierFormat("SPIKE_TOUR_QUALIFIER")).toBe(false);
    expect(isPremierFormat("SPIKE_TOUR_PLAYOFFS")).toBe(false);
  });

  it("ne départage à l'article 7 que le qualifier", () => {
    // Le format SWISS générique garde son classement historique : le faire
    // basculer changerait le classement de tournois déjà saisis.
    const suisses = TOURNAMENT_FORMATS.filter(formatUsesSwissTiebreaks);
    expect(suisses).toEqual(["SPIKE_TOUR_QUALIFIER"]);
  });
});
