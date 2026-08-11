import { describe, it, expect } from "vitest";
import { computeRating, RATING_BASELINE } from "@/lib/match-stats-core";
import {
  computeRating as scriptRating,
  RATING_BASELINE as scriptBaseline,
} from "../../scripts/recalibrate-ratings.mjs";

/*
 * Le script de recalcul tourne sur le serveur, où `tsx` n'est pas installé :
 * il recopie donc la formule. Ces tests sont le garde-fou contre la dérive
 * entre les deux copies — sans eux, un ajustement du rating ne serait répercuté
 * que d'un côté, et un `--apply` réécrirait la base avec l'ancienne échelle.
 */

const lignes = [
  { rounds: 24, kills: 20, deaths: 12, assists: 5, kastPct: 75, adr: 160 },
  { rounds: 17, kills: 5, deaths: 15, assists: 2, kastPct: 45, adr: 70 },
  { rounds: 30, kills: 30, deaths: 20, assists: 12, kastPct: 80, adr: 175 },
  { rounds: 20, kills: 15, deaths: 15, assists: 4, kastPct: 72, adr: 140 },
  { rounds: 24, kills: 0, deaths: 24, assists: 0, kastPct: 10, adr: 20 },
  { rounds: 0, kills: 0, deaths: 0, assists: 0, kastPct: 0, adr: 0 },
];

describe("script de recalibrage", () => {
  it("porte la même constante de recentrage que la formule du site", () => {
    expect(scriptBaseline).toBe(RATING_BASELINE);
  });

  it("calcule le même rating que la formule du site", () => {
    for (const l of lignes) {
      expect(scriptRating(l), JSON.stringify(l)).toBe(computeRating(l));
    }
  });
});

describe("centrage du rating", () => {
  it("place la ligne de statistiques moyenne du site sur 1.00", () => {
    // Profil moyen mesuré sur les scoreboards en base le 2026-08-11. Le KPR
    // égale le DPR par construction : sur une rencontre complète, chaque frag
    // est la mort d'un autre.
    expect(
      computeRating({
        rounds: 1000,
        kills: 660,
        deaths: 660,
        assists: 265,
        kastPct: 72.3,
        adr: 131.9,
      })
    ).toBe(1);
  });

  it("place un K/D positif bien assisté au-dessus de 1.00", () => {
    // 46/40/22 sur 63 rounds : le cas qui avait mis le décentrage en évidence.
    expect(
      computeRating({ rounds: 63, kills: 46, deaths: 40, assists: 22, kastPct: 68.8, adr: 139.2 })
    ).toBeGreaterThan(1);
  });

  it("laisse une performance franchement mauvaise sous 1.00", () => {
    expect(
      computeRating({ rounds: 24, kills: 8, deaths: 20, assists: 3, kastPct: 50, adr: 80 })
    ).toBeLessThan(1);
  });
});
