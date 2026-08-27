import { describe, it, expect } from "vitest";
import {
  premierLeaderboardSchema,
  premierHistorySchema,
  premierSeasonsSchema,
  premierTeamDetailSchema,
} from "@/lib/validation/premier";
import leaderboard from "./fixtures/premier-leaderboard.json";

describe("premierLeaderboardSchema", () => {
  it("accepte une réponse réelle", () => {
    const r = premierLeaderboardSchema.safeParse(leaderboard);
    expect(r.success).toBe(true);
  });

  it("refuse une entrée sans identifiant", () => {
    expect(premierLeaderboardSchema.safeParse([{ name: "X", tag: "X" }]).success).toBe(false);
  });

  it("refuse un identifiant vide", () => {
    const r = premierLeaderboardSchema.safeParse([
      { id: "", name: "X", tag: "X", conference: "EU_FRANCE", division: 21 },
    ]);
    expect(r.success).toBe(false);
  });

  it("tolère les champs inconnus ajoutés par l'API", () => {
    // Un ajout côté HenrikDev ne doit pas arrêter la synchronisation.
    const r = premierLeaderboardSchema.safeParse([
      { id: "u", name: "X", tag: "X", conference: "EU_FRANCE", division: 21, futur: 1 },
    ]);
    expect(r.success).toBe(true);
  });

  it("refuse une division qui n'est pas un entier", () => {
    const r = premierLeaderboardSchema.safeParse([
      { id: "u", name: "X", tag: "X", conference: "EU_FRANCE", division: "21" },
    ]);
    expect(r.success).toBe(false);
  });
});

describe("premierHistorySchema", () => {
  it("accepte un historique vide sur les deux listes", () => {
    const r = premierHistorySchema.safeParse({ league_matches: [], tournament_matches: [] });
    expect(r.success).toBe(true);
  });

  it("refuse une entrée de match sans date", () => {
    const r = premierHistorySchema.safeParse({
      league_matches: [{ id: "m1" }],
      tournament_matches: [],
    });
    expect(r.success).toBe(false);
  });

  it("accepte une entrée complète", () => {
    const r = premierHistorySchema.safeParse({
      league_matches: [{ id: "m1", started_at: "2026-05-14T17:05:32.448Z" }],
      tournament_matches: [],
    });
    expect(r.success).toBe(true);
  });
});

describe("premierSeasonsSchema", () => {
  it("accepte une saison avec ses bornes", () => {
    const r = premierSeasonsSchema.safeParse([
      { id: "s19", starts_at: "2026-08-19T03:15:00Z", ends_at: "2026-10-14T03:15:00Z" },
    ]);
    expect(r.success).toBe(true);
  });

  it("refuse une saison sans borne de fin", () => {
    const r = premierSeasonsSchema.safeParse([{ id: "s19", starts_at: "2026-08-19T03:15:00Z" }]);
    expect(r.success).toBe(false);
  });
});

describe("premierTeamDetailSchema", () => {
  it("accepte une fiche avec son roster", () => {
    const r = premierTeamDetailSchema.safeParse({
      id: "u",
      name: "Heartless",
      tag: "HL",
      member: [{ puuid: "p1", name: "nyzak", tag: "win" }],
    });
    expect(r.success).toBe(true);
  });

  it("tolère une fiche sans roster", () => {
    // Une équipe non inscrite à la saison en cours n'expose pas de membres.
    const r = premierTeamDetailSchema.safeParse({ id: "u", name: "X", tag: "X" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.member).toEqual([]);
  });
});
