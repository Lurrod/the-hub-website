import { describe, it, expect } from "vitest";
import { buildSwissStandings, buildSwissStandingRows } from "@/lib/swiss-standings";
import type { SwissMatch } from "@/lib/swiss-standings";

/** Match joué en Bo1, la forme de toutes les rondes suisses du Spike Tour. */
function bo1(teamAId: string, teamBId: string, scoreA: number, scoreB: number): SwissMatch {
  return { teamAId, teamBId, maps: [{ scoreA, scoreB }], forfeit: "NONE" };
}

describe("buildSwissStandings", () => {
  it("compte un point par victoire et les rounds des deux côtés", () => {
    const rows = buildSwissStandings(["a", "b"], [bo1("a", "b", 13, 6)]);
    expect(rows[0]).toMatchObject({
      teamId: "a",
      played: 1,
      points: 1,
      losses: 0,
      roundsWon: 13,
      roundsLost: 6,
      roundDiff: 7,
    });
    expect(rows[1]).toMatchObject({ teamId: "b", points: 0, losses: 1, roundDiff: -7 });
  });

  it("additionne les rounds de toutes les maps d'un Bo3", () => {
    // L'arbre Radiant se joue en Bo3 : le vainqueur se lit sur le total de
    // rounds, pas sur le score de série qui vaut 2-1 et perd le détail.
    const rows = buildSwissStandings(
      ["a", "b"],
      [
        {
          teamAId: "a",
          teamBId: "b",
          maps: [
            { scoreA: 13, scoreB: 11 },
            { scoreA: 9, scoreB: 13 },
            { scoreA: 13, scoreB: 8 },
          ],
          forfeit: "NONE",
        },
      ]
    );
    expect(rows[0]).toMatchObject({ teamId: "a", roundsWon: 35, roundsLost: 32, points: 1 });
  });

  it("départage à égalité de points par le Buchholz", () => {
    // « a » et « b » finissent à un point chacun, mais « a » a rencontré deux
    // équipes à deux points : ses adversaires pèsent plus lourd.
    const matches = [
      bo1("a", "c", 6, 13),
      bo1("b", "d", 6, 13),
      bo1("a", "d", 13, 6),
      bo1("b", "e", 13, 6),
      bo1("c", "e", 13, 6),
      bo1("d", "e", 13, 6),
    ];
    const rows = buildSwissStandings(["a", "b", "c", "d", "e"], matches);
    expect(rows.find((r) => r.teamId === "a")).toMatchObject({ points: 1, buchholz: 4 });
    expect(rows.find((r) => r.teamId === "b")).toMatchObject({ points: 1, buchholz: 2 });
    expect(rows.findIndex((r) => r.teamId === "a")).toBeLessThan(
      rows.findIndex((r) => r.teamId === "b")
    );
  });

  it("départage ensuite par la différence de rounds", () => {
    // a et b : un point chacun, un Buchholz nul de part et d'autre — leurs
    // victimes n'ont rien gagné. Seule la marge les sépare.
    const rows = buildSwissStandings(
      ["a", "b", "c", "d"],
      [bo1("a", "c", 13, 4), bo1("b", "d", 13, 10)]
    );
    expect(rows.map((r) => r.teamId)).toEqual(["a", "b", "d", "c"]);
    expect(rows[0]).toMatchObject({ teamId: "a", buchholz: 0, roundDiff: 9 });
    expect(rows[1]).toMatchObject({ teamId: "b", buchholz: 0, roundDiff: 3 });
  });

  it("compte une victoire par forfait 13-6", () => {
    // Le règlement le dit explicitement, et un forfait se saisit à 0-0 dans ce
    // dépôt : sans cette convention, l'équipe présente perdrait de la
    // différence de rounds pour une absence dont elle n'est pas responsable.
    const rows = buildSwissStandings(
      ["a", "b"],
      [{ teamAId: "a", teamBId: "b", maps: [], forfeit: "TEAM_B" }]
    );
    expect(rows[0]).toMatchObject({ teamId: "a", points: 1, roundsWon: 13, roundsLost: 6 });
    expect(rows[1]).toMatchObject({ teamId: "b", points: 0, roundsWon: 6, roundsLost: 13 });
  });

  it("ignore un match dont aucune map n'est saisie", () => {
    // Un match programmé, ou terminé sans détail de maps, n'apprend rien : le
    // compter en « joué » afficherait une ronde à 0-0 pour tout le monde.
    const rows = buildSwissStandings(
      ["a", "b"],
      [{ teamAId: "a", teamBId: "b", maps: [], forfeit: "NONE" }]
    );
    expect(rows[0].played).toBe(0);
    expect(rows[0].buchholz).toBe(0);
  });

  it("marque les équipes que l'article 7 ne sépare pas", () => {
    // Deux équipes indiscernables sur les quatre critères : le règlement fait
    // jouer un tie-break le soir même. Les départager par identifiant
    // inventerait un classement que l'organisation ne reconnaît pas.
    const rows = buildSwissStandings(
      ["a", "b", "c", "d", "e"],
      [bo1("a", "c", 13, 6), bo1("b", "d", 13, 6)]
    );
    // a et b : un point, un Buchholz nul, +7 de différence, 13-6 de rounds.
    expect(rows.find((r) => r.teamId === "a")?.tied).toBe(true);
    expect(rows.find((r) => r.teamId === "b")?.tied).toBe(true);
    // « e » n'a pas joué : son zéro pointé ne se confond avec aucun battu.
    expect(rows.find((r) => r.teamId === "e")?.tied).toBe(false);
  });

  it("laisse à zéro une équipe qui n'a pas joué", () => {
    const rows = buildSwissStandings(["a", "b"], []);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ played: 0, points: 0, buchholz: 0, roundDiff: 0 });
  });

  it("ignore les matchs d'équipes hors du tournoi", () => {
    const rows = buildSwissStandings(["a"], [bo1("a", "zz", 13, 6)]);
    expect(rows[0].played).toBe(0);
  });

  it("ne touche pas à ses entrées", () => {
    const matches: SwissMatch[] = [bo1("a", "b", 13, 6)];
    const copie = structuredClone(matches);
    buildSwissStandings(["a", "b"], matches);
    expect(matches).toEqual(copie);
  });
});

describe("buildSwissStandingRows", () => {
  it("résout le nom et le tag des équipes", () => {
    const rows = buildSwissStandingRows(
      [
        { teamId: "a", name: "Alpha", tag: "ALP" },
        { teamId: "b", name: "Beta", tag: "BET" },
      ],
      [bo1("a", "b", 13, 6)]
    );
    expect(rows[0]).toMatchObject({ teamId: "a", teamName: "Alpha", teamTag: "ALP", points: 1 });
  });

  it("retombe sur l'identifiant quand l'équipe est introuvable", () => {
    // Le classement ne doit pas disparaître parce qu'une inscription a été
    // supprimée après coup : la ligne reste, sous son identifiant.
    const rows = buildSwissStandingRows([{ teamId: "a", name: "Alpha", tag: "ALP" }], []);
    expect(rows[0].teamName).toBe("Alpha");
  });
});
