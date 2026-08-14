import { describe, it, expect } from "vitest";
import {
  buildBracket,
  bracketLayoutFor,
  defaultBestOfFor,
  parseRound,
  roundLabelForSize,
  roundSizeFromLabel,
  type BracketMatchData,
  type BracketRound,
} from "@/lib/bracket";

const mk = (id: string, round: string | null, position?: number | null): BracketMatchData => ({
  id,
  round,
  teamAId: "a",
  teamBId: "b",
  scoreA: 0,
  scoreB: 0,
  winnerId: null,
  position: position ?? null,
  teamA: { tag: "A" },
  teamB: { tag: "B" },
});

const names = (rounds: BracketRound[]) => rounds.map((r) => r.name);
const sizes = (rounds: BracketRound[]) => rounds.map((r) => r.slots.length);
const kinds = (round: BracketRound) => round.slots.map((s) => s.kind);

describe("roundSizeFromLabel / roundLabelForSize", () => {
  it("déduit la profondeur depuis les libellés connus", () => {
    expect(roundSizeFromLabel("Finale")).toBe(1);
    expect(roundSizeFromLabel("Demi-finales")).toBe(2);
    expect(roundSizeFromLabel("Quarts de finale")).toBe(4);
    expect(roundSizeFromLabel("huitiemes")).toBe(8);
    expect(roundSizeFromLabel("Round of 16")).toBe(8);
    expect(roundSizeFromLabel("1/16 de finale")).toBe(16);
  });
  it("renvoie null pour un libellé sans profondeur", () => {
    expect(roundSizeFromLabel("Tour 1")).toBeNull();
    expect(roundSizeFromLabel("Repêchage")).toBeNull();
  });
  it("nomme un round d'après sa taille", () => {
    expect(roundLabelForSize(1)).toBe("Finale");
    expect(roundLabelForSize(4)).toBe("Quarts de finale");
    expect(roundLabelForSize(64)).toBe("1/64e de finale");
  });
});

describe("bracketLayoutFor", () => {
  it("choisit la géométrie selon le format", () => {
    expect(bracketLayoutFor("SINGLE_ELIM")).toBe("tree");
    expect(bracketLayoutFor("GROUPS_THEN_ELIM")).toBe("tree");
    expect(bracketLayoutFor("DOUBLE_ELIM")).toBe("double");
    expect(bracketLayoutFor("SWISS")).toBe("flat");
    expect(bracketLayoutFor("LEAGUE")).toBe("flat");
  });
});

describe("parseRound", () => {
  it("détecte les sections upper / lower / finale", () => {
    expect(parseRound("UB Finale")).toEqual({ section: "upper", label: "Finale" });
    expect(parseRound("LB Round 1")).toEqual({ section: "lower", label: "Round 1" });
    expect(parseRound("Lower Bracket Finale")).toEqual({ section: "lower", label: "Finale" });
    expect(parseRound("Grande Finale")).toEqual({ section: "final", label: "Grande Finale" });
    expect(parseRound("Demi-finales")).toEqual({ section: "single", label: "Demi-finales" });
  });
});

describe("buildBracket - élimination directe", () => {
  it("ordonne les rounds de l'entrée du tableau vers la finale", () => {
    const { layout, sections } = buildBracket(
      [
        mk("f", "Finale"),
        mk("q1", "Quarts de finale"),
        mk("q2", "Quarts de finale"),
        mk("d1", "Demi-finales"),
        mk("q3", "Quarts de finale"),
        mk("q4", "Quarts de finale"),
        mk("d2", "Demi-finales"),
      ],
      "SINGLE_ELIM"
    );
    expect(layout).toBe("tree");
    expect(sections).toHaveLength(1);
    expect(names(sections[0].rounds)).toEqual(["Quarts de finale", "Demi-finales", "Finale"]);
    expect(sizes(sections[0].rounds)).toEqual([4, 2, 1]);
  });

  it("complète un tableau de 6 équipes avec des byes", () => {
    const { sections } = buildBracket(
      [
        mk("q1", "Quarts de finale"),
        mk("q2", "Quarts de finale"),
        mk("d1", "Demi-finales"),
        mk("d2", "Demi-finales"),
        mk("f", "Finale"),
      ],
      "SINGLE_ELIM"
    );
    const [quarts, demis, finale] = sections[0].rounds;
    expect(sizes([quarts, demis, finale])).toEqual([4, 2, 1]);
    expect(kinds(quarts)).toEqual(["match", "match", "bye", "bye"]);
    expect(kinds(demis)).toEqual(["match", "match"]);
  });

  it("place les matchs selon bracketPosition et met les byes dans les trous", () => {
    const { sections } = buildBracket(
      [mk("q1", "Quarts de finale", 1), mk("q4", "Quarts de finale", 4), mk("f", "Finale", 1)],
      "SINGLE_ELIM"
    );
    const quarts = sections[0].rounds[0];
    expect(quarts.slots).toHaveLength(4);
    expect(kinds(quarts)).toEqual(["match", "bye", "bye", "match"]);
  });

  it("nomme les rounds génériques d'après leur profondeur", () => {
    const { sections } = buildBracket(
      [mk("a", "Tour 1"), mk("b", "Tour 1"), mk("c", "Tour 2")],
      "SINGLE_ELIM"
    );
    expect(names(sections[0].rounds)).toEqual(["Demi-finales", "Finale"]);
  });

  it("n'invente pas de tours quand le tableau est encore incomplet", () => {
    const { sections } = buildBracket(
      [mk("h1", "Huitièmes de finale"), mk("h2", "Huitièmes de finale")],
      "SINGLE_ELIM"
    );
    expect(names(sections[0].rounds)).toEqual(["Huitièmes de finale"]);
    expect(sizes(sections[0].rounds)).toEqual([8]);
  });

  it("garde un libellé personnalisé inconnu", () => {
    const { sections } = buildBracket([mk("r", "Repêchage"), mk("f", "Finale")], "SINGLE_ELIM");
    expect(names(sections[0].rounds)).toContain("Repêchage");
  });

  it("absorbe une « Grande finale » dans l'arbre unique", () => {
    const { layout, sections } = buildBracket(
      [mk("d1", "Demi-finales"), mk("d2", "Demi-finales"), mk("gf", "Grande Finale")],
      "SINGLE_ELIM"
    );
    expect(layout).toBe("tree");
    expect(sections).toHaveLength(1);
    expect(sections[0].rounds).toHaveLength(2);
  });
});

describe("buildBracket - double élimination", () => {
  it("sépare et ordonne upper, lower puis grande finale", () => {
    const { layout, sections } = buildBracket(
      [
        mk("gf", "Grande Finale"),
        mk("lb1", "LB Round 1"),
        mk("lbf", "LB Finale"),
        mk("ub1", "UB Demi-finale"),
        mk("ub2", "UB Demi-finale"),
        mk("ubf", "UB Finale"),
      ],
      "DOUBLE_ELIM"
    );
    expect(layout).toBe("double");
    expect(sections.map((s) => s.key)).toEqual(["upper", "lower", "final"]);
    expect(names(sections[0].rounds)).toEqual(["Demi-finales", "Finale"]);
    expect(names(sections[1].rounds)).toEqual(["Round 1", "Finale"]);
    expect(sections[2].title).toBe("Grande Finale");
  });

  it("ne complète pas le lower bracket avec des byes", () => {
    const { sections } = buildBracket(
      [mk("lb1", "LB Round 1"), mk("lb2", "LB Round 2"), mk("ubf", "UB Finale")],
      "DOUBLE_ELIM"
    );
    const lower = sections.find((s) => s.key === "lower")!;
    expect(sizes(lower.rounds)).toEqual([1, 1]);
    expect(lower.rounds.every((r) => r.slots.every((s) => s.kind === "match"))).toBe(true);
  });

  it("bascule en double élimination si les données contiennent un lower bracket", () => {
    const { layout } = buildBracket([mk("lb", "LB Finale"), mk("f", "Finale")], "SINGLE_ELIM");
    expect(layout).toBe("double");
  });
});

describe("buildBracket - formats sans arbre", () => {
  it("liste les rondes en colonnes, sans bye", () => {
    const { layout, sections } = buildBracket(
      [mk("a", "Tour 1"), mk("b", "Tour 1"), mk("c", "Tour 2")],
      "SWISS"
    );
    expect(layout).toBe("flat");
    expect(names(sections[0].rounds)).toEqual(["Tour 1", "Tour 2"]);
    expect(sizes(sections[0].rounds)).toEqual([2, 1]);
  });

  it("ne rend aucune section sans match", () => {
    expect(buildBracket([], "SINGLE_ELIM").sections).toEqual([]);
  });
});

describe("géométrie des formats Premier", () => {
  it("dessine l'Invite en arbre simple et le Contender en brackets parallèles", () => {
    expect(bracketLayoutFor("PREMIER_INVITE")).toBe("tree");
    expect(bracketLayoutFor("PREMIER_CONTENDER")).toBe("multi");
  });
});

describe("defaultBestOfFor", () => {
  it("met la finale en Bo3 sur les deux formats Premier", () => {
    expect(defaultBestOfFor("PREMIER_INVITE", "Finale")).toBe(3);
    expect(defaultBestOfFor("PREMIER_CONTENDER", "Grande finale")).toBe(3);
  });

  it("met tous les autres tours en Bo1", () => {
    expect(defaultBestOfFor("PREMIER_INVITE", "Demi-finales")).toBe(1);
    expect(defaultBestOfFor("PREMIER_CONTENDER", "Quarts de finale")).toBe(1);
  });

  it("répond Bo1 quand le round n'est pas encore saisi", () => {
    // Cas de la création d'un match : le round n'existe pas au moment où le
    // formulaire calcule son défaut.
    expect(defaultBestOfFor("PREMIER_CONTENDER", null)).toBe(1);
    expect(defaultBestOfFor("PREMIER_INVITE", "")).toBe(1);
  });

  it("laisse les formats non-Premier sur le Bo1 déjà en place", () => {
    expect(defaultBestOfFor("SINGLE_ELIM", "Finale")).toBe(1);
    expect(defaultBestOfFor("GROUPS", "Finale")).toBe(1);
  });
});
