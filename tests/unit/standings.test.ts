import { describe, it, expect } from "vitest";
import { buildStandingRows, computeStandings } from "@/lib/standings";

describe("computeStandings", () => {
  it("initialise chaque équipe à zéro sans match", () => {
    const rows = computeStandings(["a", "b"], []);
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.played === 0 && r.wins === 0)).toBe(true);
  });

  it("compte victoires, défaites et maps pour un match", () => {
    const rows = computeStandings(
      ["a", "b"],
      [{ teamAId: "a", teamBId: "b", scoreA: 2, scoreB: 1 }]
    );
    const a = rows.find((r) => r.teamId === "a")!;
    const b = rows.find((r) => r.teamId === "b")!;
    expect(a).toMatchObject({ played: 1, wins: 1, losses: 0, mapsWon: 2, mapsLost: 1, mapDiff: 1 });
    expect(b).toMatchObject({
      played: 1,
      wins: 0,
      losses: 1,
      mapsWon: 1,
      mapsLost: 2,
      mapDiff: -1,
    });
  });

  it("trie par victoires décroissantes", () => {
    const rows = computeStandings(
      ["a", "b", "c"],
      [
        { teamAId: "a", teamBId: "b", scoreA: 2, scoreB: 0 },
        { teamAId: "a", teamBId: "c", scoreA: 2, scoreB: 0 },
        { teamAId: "b", teamBId: "c", scoreA: 2, scoreB: 1 },
      ]
    );
    expect(rows.map((r) => r.teamId)).toEqual(["a", "b", "c"]);
  });

  it("départage par différence de maps à victoires égales", () => {
    const rows = computeStandings(
      ["a", "b"],
      [
        { teamAId: "a", teamBId: "b", scoreA: 2, scoreB: 0 },
        { teamAId: "b", teamBId: "a", scoreA: 2, scoreB: 1 },
      ]
    );
    expect(rows[0].teamId).toBe("a");
  });

  it("départage par maps gagnées quand la différence est égale", () => {
    const rows = computeStandings(
      ["a", "b", "c", "d"],
      [
        { teamAId: "a", teamBId: "c", scoreA: 2, scoreB: 1 },
        { teamAId: "d", teamBId: "a", scoreA: 2, scoreB: 1 },
        { teamAId: "b", teamBId: "c", scoreA: 2, scoreB: 2 },
        { teamAId: "d", teamBId: "b", scoreA: 1, scoreB: 2 },
        { teamAId: "b", teamBId: "d", scoreA: 0, scoreB: 1 },
      ]
    );
    const a = rows.find((r) => r.teamId === "a")!;
    const b = rows.find((r) => r.teamId === "b")!;
    expect(b.mapDiff).toBe(a.mapDiff);
    expect(b.mapsWon).toBeGreaterThan(a.mapsWon);
    expect(rows.indexOf(b)).toBeLessThan(rows.indexOf(a));
  });

  it("ignore les matchs impliquant une équipe hors de la poule", () => {
    const rows = computeStandings(
      ["a", "b"],
      [{ teamAId: "a", teamBId: "z", scoreA: 2, scoreB: 0 }]
    );
    const a = rows.find((r) => r.teamId === "a")!;
    expect(a.played).toBe(0);
  });
});

describe("buildStandingRows", () => {
  const teams = [
    { teamId: "a", name: "Alpha", tag: "ALP" },
    { teamId: "b", name: "Bravo", tag: "BRV" },
  ];

  it("résout le nom et le tag de chaque équipe, dans l'ordre du classement", () => {
    const rows = buildStandingRows(teams, [{ teamAId: "a", teamBId: "b", scoreA: 0, scoreB: 2 }]);
    expect(rows.map((r) => r.teamTag)).toEqual(["BRV", "ALP"]);
    expect(rows[0].teamName).toBe("Bravo");
    expect(rows[0].wins).toBe(1);
    expect(rows[1].losses).toBe(1);
  });

  it("retombe sur l'identifiant quand l'équipe est inconnue", () => {
    const rows = buildStandingRows([{ teamId: "x", name: "X", tag: "X" }], []);
    expect(rows).toHaveLength(1);
    expect(rows[0].played).toBe(0);
  });

  it("rend un classement vide sans équipe", () => {
    expect(buildStandingRows([], [{ teamAId: "a", teamBId: "b", scoreA: 2, scoreB: 0 }])).toEqual(
      []
    );
  });
});

describe("matchs nuls", () => {
  it("compte une série à égalité de maps comme un nul des deux côtés", () => {
    const rows = computeStandings(
      ["a", "b"],
      [{ teamAId: "a", teamBId: "b", scoreA: 1, scoreB: 1 }]
    );
    for (const r of rows) {
      expect(r.played).toBe(1);
      expect(r.draws).toBe(1);
      expect(r.wins).toBe(0);
      expect(r.losses).toBe(0);
    }
  });

  it("n'incrémente pas les nuls sur une série décidée", () => {
    const rows = computeStandings(
      ["a", "b"],
      [{ teamAId: "a", teamBId: "b", scoreA: 2, scoreB: 0 }]
    );
    expect(rows.every((r) => r.draws === 0)).toBe(true);
  });

  it("remonte les nuls jusqu'à la ligne d'affichage", () => {
    const rows = buildStandingRows(
      [
        { teamId: "a", name: "A", tag: "A" },
        { teamId: "b", name: "B", tag: "B" },
      ],
      [{ teamAId: "a", teamBId: "b", scoreA: 1, scoreB: 1 }]
    );
    expect(rows[0].draws).toBe(1);
  });
});
