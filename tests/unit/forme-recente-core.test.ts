import { describe, it, expect } from "vitest";
import { construireForme, type MatchSource } from "@/lib/forme-recente-core";

const NOUS = "nous";

/**
 * Match minimal vu depuis « nous », qu'on place en A ou en B selon le besoin.
 *
 * Le type est écrit à la main plutôt que dérivé de `MatchForme` : celui-ci est
 * le résultat du calcul, où `maps` désigne un score et non la liste des maps
 * jouées. Les deux se ressemblent et ne disent pas la même chose.
 */
function match(over: {
  id: string;
  date?: Date;
  maps?: { scoreA: number; scoreB: number }[];
  chezA?: boolean;
  vainqueur?: "nous" | "eux" | null;
  mapsPour?: number;
  mapsContre?: number;
}): MatchSource {
  const chezA = over.chezA ?? true;
  const vainqueur =
    over.vainqueur === "nous" ? NOUS : over.vainqueur === "eux" ? "eux" : (null as string | null);
  const maps = over.maps ?? [];
  return {
    id: over.id,
    date: over.date ?? new Date("2026-08-01T00:00:00Z"),
    teamAId: chezA ? NOUS : "eux",
    teamBId: chezA ? "eux" : NOUS,
    scoreA: chezA ? (over.mapsPour ?? 1) : (over.mapsContre ?? 0),
    scoreB: chezA ? (over.mapsContre ?? 0) : (over.mapsPour ?? 1),
    winnerId: vainqueur,
    teamA: chezA ? { tag: "NS", logo: null } : { tag: "EUX", logo: "l.png" },
    teamB: chezA ? { tag: "EUX", logo: "l.png" } : { tag: "NS", logo: null },
    maps: chezA ? maps : maps.map((m) => ({ scoreA: m.scoreB, scoreB: m.scoreA })),
  };
}

describe("construireForme", () => {
  it("ne rend rien sans match", () => {
    const forme = construireForme([], NOUS);
    expect(forme.matchs).toEqual([]);
    expect(forme.ecartMax).toBe(0);
    expect(forme.serie).toBe(0);
  });

  it("lit le résultat depuis le vainqueur, pas depuis les scores", () => {
    // Sur un forfait les scores restent à 0-0 : les comparer classerait la
    // rencontre en match nul alors qu'elle a un vainqueur.
    const forme = construireForme(
      [match({ id: "m", vainqueur: "nous", mapsPour: 0, mapsContre: 0 })],
      NOUS
    );
    expect(forme.matchs[0].resultat).toBe("WIN");
  });

  it("compte l'écart de rounds, toutes maps confondues", () => {
    const forme = construireForme(
      [
        match({
          id: "m",
          vainqueur: "nous",
          maps: [
            { scoreA: 13, scoreB: 7 },
            { scoreA: 11, scoreB: 13 },
            { scoreA: 13, scoreB: 9 },
          ],
        }),
      ],
      NOUS
    );
    // (13-7) + (11-13) + (13-9) = +8
    expect(forme.matchs[0].ecart).toBe(8);
    expect(forme.matchs[0].rounds).toEqual({ pour: 37, contre: 29 });
  });

  it("se place du bon côté quand l'équipe joue en B", () => {
    const forme = construireForme(
      [match({ id: "m", chezA: false, vainqueur: "nous", maps: [{ scoreA: 13, scoreB: 4 }] })],
      NOUS
    );
    expect(forme.matchs[0].ecart).toBe(9);
    expect(forme.matchs[0].adversaire.tag).toBe("EUX");
  });

  it("rend un écart nul quand le détail des rounds manque", () => {
    // Les matchs importés sans scoreboard n'ont pas de map : inventer une
    // hauteur de barre leur ferait dire une domination qu'on ne connaît pas.
    const forme = construireForme([match({ id: "m", vainqueur: "nous", maps: [] })], NOUS);
    expect(forme.matchs[0].ecart).toBeNull();
    expect(forme.matchs[0].rounds).toBeNull();
  });

  it("classe du plus ancien au plus récent", () => {
    // L'entrée vient de la base, du plus récent au plus ancien. Une frise se
    // lit dans l'autre sens.
    const forme = construireForme(
      [
        match({ id: "recent", date: new Date("2026-08-20T00:00:00Z"), vainqueur: "nous" }),
        match({ id: "ancien", date: new Date("2026-08-01T00:00:00Z"), vainqueur: "eux" }),
      ],
      NOUS
    );
    expect(forme.matchs.map((m) => m.id)).toEqual(["ancien", "recent"]);
  });

  it("établit le bilan", () => {
    const forme = construireForme(
      [
        match({ id: "a", vainqueur: "nous" }),
        match({ id: "b", vainqueur: "eux" }),
        match({ id: "c", vainqueur: null }),
        match({ id: "d", vainqueur: "nous" }),
      ],
      NOUS
    );
    expect(forme.victoires).toBe(2);
    expect(forme.defaites).toBe(1);
    expect(forme.nuls).toBe(1);
  });

  it("compte la série en cours depuis le match le plus récent", () => {
    // Positif pour des victoires d'affilée, négatif pour des défaites. L'entrée
    // étant du plus récent au plus ancien, la série se lit en tête.
    const gagnantes = construireForme(
      [
        match({ id: "a", vainqueur: "nous" }),
        match({ id: "b", vainqueur: "nous" }),
        match({ id: "c", vainqueur: "eux" }),
      ],
      NOUS
    );
    expect(gagnantes.serie).toBe(2);

    const perdantes = construireForme(
      [
        match({ id: "a", vainqueur: "eux" }),
        match({ id: "b", vainqueur: "eux" }),
        match({ id: "c", vainqueur: "eux" }),
      ],
      NOUS
    );
    expect(perdantes.serie).toBe(-3);
  });

  it("arrête la série sur un match sans vainqueur", () => {
    const forme = construireForme(
      [match({ id: "a", vainqueur: null }), match({ id: "b", vainqueur: "nous" })],
      NOUS
    );
    expect(forme.serie).toBe(0);
  });

  it("donne l'échelle des barres par le plus grand écart", () => {
    const forme = construireForme(
      [
        match({ id: "a", vainqueur: "nous", maps: [{ scoreA: 13, scoreB: 11 }] }),
        match({ id: "b", vainqueur: "eux", maps: [{ scoreA: 3, scoreB: 13 }] }),
      ],
      NOUS
    );
    // La défaite 3-13 pèse dix, c'est elle qui cale la hauteur maximale.
    expect(forme.ecartMax).toBe(10);
  });

  it("borne le nombre de matchs retenus", () => {
    const beaucoup = Array.from({ length: 30 }, (_, i) =>
      match({ id: `m${i}`, vainqueur: "nous" })
    );
    expect(construireForme(beaucoup, NOUS, 12).matchs).toHaveLength(12);
  });

  it("garde les plus récents quand il borne", () => {
    const forme = construireForme(
      [
        match({ id: "recent", date: new Date("2026-08-20T00:00:00Z"), vainqueur: "nous" }),
        match({ id: "milieu", date: new Date("2026-08-10T00:00:00Z"), vainqueur: "nous" }),
        match({ id: "vieux", date: new Date("2026-08-01T00:00:00Z"), vainqueur: "nous" }),
      ],
      NOUS,
      2
    );
    expect(forme.matchs.map((m) => m.id)).toEqual(["milieu", "recent"]);
  });
});
