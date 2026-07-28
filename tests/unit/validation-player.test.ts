import { describe, it, expect } from "vitest";
import { playerInputSchema, rosterAddSchema } from "@/lib/validation/player";

const validPlayer = {
  pseudo: "AlphaGuy",
  realName: "Jean Dupont",
  nationality: "France",
  socials: { twitter: "https://x.com/alphaguy" },
};

describe("playerInputSchema", () => {
  it("accepte un joueur valide", () => {
    expect(playerInputSchema.safeParse(validPlayer).success).toBe(true);
  });
  it("accepte juste un pseudo", () => {
    expect(playerInputSchema.safeParse({ pseudo: "Solo" }).success).toBe(true);
  });
  it("rejette un pseudo vide", () => {
    expect(playerInputSchema.safeParse({ ...validPlayer, pseudo: "" }).success).toBe(false);
  });
  it("rejette une URL sociale javascript: (XSS)", () => {
    expect(
      playerInputSchema.safeParse({ pseudo: "X", socials: { twitter: "javascript:alert(1)" } })
        .success
    ).toBe(false);
  });
  it("accepte un Twitter x.com et un Twitch twitch.tv", () => {
    expect(
      playerInputSchema.safeParse({
        pseudo: "X",
        socials: { twitter: "https://x.com/x", twitch: "https://twitch.tv/x" },
      }).success
    ).toBe(true);
  });
  it("rejette un Twitter qui n'est pas x.com", () => {
    expect(
      playerInputSchema.safeParse({ pseudo: "X", socials: { twitter: "https://twitter.com/x" } })
        .success
    ).toBe(false);
  });
  it("rejette un Twitch qui n'est pas twitch.tv", () => {
    expect(
      playerInputSchema.safeParse({ pseudo: "X", socials: { twitch: "https://youtube.com/x" } })
        .success
    ).toBe(false);
  });
});

describe("rosterAddSchema", () => {
  it("accepte pseudo + rôle valide", () => {
    expect(rosterAddSchema.safeParse({ pseudo: "New", role: "JOUEUR" }).success).toBe(true);
  });
  it("rôle par défaut JOUEUR si absent", () => {
    const r = rosterAddSchema.safeParse({ pseudo: "New" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.role).toBe("JOUEUR");
  });
  it("rejette l'ancien rôle STARTER", () => {
    expect(rosterAddSchema.safeParse({ pseudo: "New", role: "STARTER" }).success).toBe(false);
  });
  it("rejette un rôle inconnu", () => {
    expect(rosterAddSchema.safeParse({ pseudo: "New", role: "CAPTAIN" }).success).toBe(false);
  });
});
