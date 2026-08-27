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

  it("accepte une participation à un tournoi, de forme différente des matchs de ligue", () => {
    // Relevé sur l'API : `tournament_matches` ne liste pas des matchs mais des
    // participations, chacune portant ses identifiants de partie dans
    // `matches[]`. Ni `id` ni `started_at` au premier niveau.
    const r = premierHistorySchema.safeParse({
      league_matches: [],
      tournament_matches: [
        {
          tournament_id: "7178998a-746b-4d6a-af66-b234ae2bf305",
          placement: 1,
          placement_league_bonus: 0,
          points_before: 1100,
          points_after: 1100,
          matches: ["cc2765fa-67d5-481d-b76b-7397133dff38", "9542e385-43e8-4b97-9c65-58b126b636f8"],
        },
      ],
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.tournament_matches[0].matches).toHaveLength(2);
  });

  it("tolère une participation sans partie jouée", () => {
    const r = premierHistorySchema.safeParse({
      league_matches: [],
      tournament_matches: [{ tournament_id: "t1" }],
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.tournament_matches[0].matches).toEqual([]);
  });

  it("écarte les créneaux de match non joués", () => {
    // Une équipe éliminée tôt garde des cases vides dans l'arbre : c'est une
    // donnée normale, pas une réponse malformée.
    const r = premierHistorySchema.safeParse({
      league_matches: [],
      tournament_matches: [{ tournament_id: "t1", matches: ["m1", "", "m2", ""] }],
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.tournament_matches[0].matches).toEqual(["m1", "m2"]);
  });

  it("refuse une participation sans identifiant de tournoi", () => {
    const r = premierHistorySchema.safeParse({
      league_matches: [],
      tournament_matches: [{ placement: 1, matches: [] }],
    });
    expect(r.success).toBe(false);
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
