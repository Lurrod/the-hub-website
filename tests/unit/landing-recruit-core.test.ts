import { describe, expect, it } from "vitest";
import {
  buildRecruitAds,
  sinceLabel,
  type RecruitPlayerRow,
  type RecruitTeamRow,
} from "@/lib/landing-recruit-core";
import { fichePath } from "@/lib/slug";

const NOW = new Date("2026-09-22T20:00:00Z");
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000);

function player(over: Partial<RecruitPlayerRow> = {}): RecruitPlayerRow {
  return {
    id: "p1",
    pseudo: "sylk",
    photo: null,
    valorantRole: "DUELIST",
    accountType: "JOUEUR",
    lftSince: daysAgo(1),
    ...over,
  };
}

function team(over: Partial<RecruitTeamRow> = {}): RecruitTeamRow {
  return {
    id: "t1",
    name: "Nordique",
    tag: "NRD",
    logo: null,
    lfpRoles: ["CONTROLLER"],
    lfpSince: daysAgo(2),
    rosterCount: 4,
    ...over,
  };
}

describe("sinceLabel", () => {
  it("dit « aujourd'hui » dans les premières 24 h", () => {
    expect(sinceLabel(new Date(NOW.getTime() - 3_600_000), NOW)).toBe("aujourd'hui");
  });
  it("dit « hier » entre un et deux jours", () => {
    expect(sinceLabel(daysAgo(1), NOW)).toBe("hier");
  });
  it("compte en jours sous une semaine", () => {
    expect(sinceLabel(daysAgo(4), NOW)).toBe("il y a 4 j");
  });
  it("compte en semaines sous un mois", () => {
    expect(sinceLabel(daysAgo(15), NOW)).toBe("il y a 2 sem.");
  });
  it("compte en mois au-delà", () => {
    expect(sinceLabel(daysAgo(95), NOW)).toBe("il y a 3 mois");
  });
  it("ne dit rien sans date", () => {
    expect(sinceLabel(null, NOW)).toBeNull();
  });
  it("ne part pas dans le futur si l'horloge du serveur retarde", () => {
    expect(sinceLabel(new Date(NOW.getTime() + 60_000), NOW)).toBe("aujourd'hui");
  });
});

describe("buildRecruitAds", () => {
  it("rend une annonce LFT menant à la fiche joueur, rôle et ancienneté en faits", () => {
    const [ad] = buildRecruitAds([player()], [], 3, NOW);
    expect(ad).toMatchObject({
      key: "lft-p1",
      kind: "LFT",
      name: "sylk",
      tag: "SY",
      href: fichePath("joueurs", "p1", "sylk"),
      facts: ["Duelliste", "hier"],
    });
  });

  it("remplace le rôle par le type de compte pour un coach", () => {
    const [ad] = buildRecruitAds(
      [player({ accountType: "COACH", valorantRole: null })],
      [],
      3,
      NOW
    );
    expect(ad.facts[0]).toBe("Coach");
  });

  it("rend une annonce LFP avec les postes cherchés et la taille du roster", () => {
    const [ad] = buildRecruitAds([], [team()], 3, NOW);
    expect(ad).toMatchObject({
      key: "lfp-t1",
      kind: "LFP",
      name: "Nordique",
      tag: "NRD",
      href: fichePath("equipes", "t1", "Nordique"),
      facts: ["Cherche Contrôleur", "4 joueurs", "il y a 2 j"],
    });
  });

  it("dit « tous les postes » quand l'équipe n'en précise aucun", () => {
    const [ad] = buildRecruitAds([], [team({ lfpRoles: [], rosterCount: 1 })], 3, NOW);
    expect(ad.facts.slice(0, 2)).toEqual(["Tous les postes", "1 joueur"]);
  });

  it("trie par fraîcheur, annonces sans date en dernier", () => {
    const ads = buildRecruitAds(
      [player({ id: "old", lftSince: null }), player({ id: "new", lftSince: daysAgo(0.5) })],
      [team({ lfpSince: daysAgo(3) })],
      3,
      NOW
    );
    expect(ads.map((a) => a.key)).toEqual(["lft-new", "lfp-t1", "lft-old"]);
  });

  it("garde au moins une annonce de chaque sorte quand les deux existent", () => {
    const players = [1, 2, 3].map((i) =>
      player({ id: `p${i}`, pseudo: `j${i}`, lftSince: daysAgo(i * 0.1) })
    );
    const ads = buildRecruitAds(players, [team({ lfpSince: daysAgo(30) })], 3, NOW);
    expect(ads).toHaveLength(3);
    expect(ads.map((a) => a.kind)).toContain("LFP");
    expect(ads.map((a) => a.key)).toEqual(["lft-p1", "lft-p2", "lfp-t1"]);
  });

  it("ne dépasse pas la limite et accepte des listes vides", () => {
    expect(buildRecruitAds([], [], 3, NOW)).toEqual([]);
    const players = [1, 2, 3, 4].map((i) => player({ id: `p${i}`, pseudo: `j${i}` }));
    expect(buildRecruitAds(players, [], 3, NOW)).toHaveLength(3);
  });

  it("ne modifie pas les listes reçues", () => {
    const players = Object.freeze([player({ id: "a" }), player({ id: "b", lftSince: null })]);
    const teams = Object.freeze([team()]);
    expect(() => buildRecruitAds(players, teams, 3, NOW)).not.toThrow();
  });
});
