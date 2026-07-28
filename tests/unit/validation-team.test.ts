import { describe, it, expect } from "vitest";
import { teamInputSchema } from "@/lib/validation/team";

const valid = {
  name: "Team Alpha",
  tag: "ALP",
  region: "France",
  description: "Une équipe T3.",
  status: "ACTIVE",
  socials: { twitter: "https://x.com/alpha" },
};

describe("teamInputSchema", () => {
  it("accepte une entrée valide", () => {
    const r = teamInputSchema.safeParse(valid);
    expect(r.success).toBe(true);
  });
  it("rejette un nom vide", () => {
    expect(teamInputSchema.safeParse({ ...valid, name: "" }).success).toBe(false);
  });
  it("rejette une région inconnue", () => {
    expect(teamInputSchema.safeParse({ ...valid, region: "Mars" }).success).toBe(false);
  });
  it("rejette un tag trop long", () => {
    expect(teamInputSchema.safeParse({ ...valid, tag: "TOOLONGTAG" }).success).toBe(false);
  });
  it("accepte sans description ni socials", () => {
    const { description, socials, ...min } = valid;
    expect(teamInputSchema.safeParse(min).success).toBe(true);
  });
  it("rejette une URL social invalide", () => {
    expect(
      teamInputSchema.safeParse({ ...valid, socials: { twitter: "pas-une-url" } }).success
    ).toBe(false);
  });
  it("rejette une URL social en javascript: (XSS)", () => {
    expect(
      teamInputSchema.safeParse({ ...valid, socials: { twitter: "javascript:alert(1)" } }).success
    ).toBe(false);
  });
  it("rejette un Twitter qui n'est pas x.com", () => {
    expect(
      teamInputSchema.safeParse({ ...valid, socials: { twitter: "https://twitter.com/alpha" } })
        .success
    ).toBe(false);
  });
  it("rejette un Twitch qui n'est pas twitch.tv", () => {
    expect(
      teamInputSchema.safeParse({ ...valid, socials: { twitch: "https://example.com/alpha" } })
        .success
    ).toBe(false);
  });
  it("accepte Twitch twitch.tv et YouTube/Discord génériques", () => {
    expect(
      teamInputSchema.safeParse({
        ...valid,
        socials: {
          twitter: "https://x.com/alpha",
          twitch: "https://twitch.tv/alpha",
          youtube: "https://youtube.com/@alpha",
          discord: "https://discord.gg/alpha",
        },
      }).success
    ).toBe(true);
  });
});
