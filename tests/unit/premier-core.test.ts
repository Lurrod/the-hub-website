import { describe, it, expect } from "vitest";
import {
  frenchTierOf,
  frenchTiers,
  seasonOfMatch,
  seasonNumberOf,
  dedupeMatchIds,
  sideOfRoster,
  bracketsOf,
  tournamentStatusFor,
  quotaDelayMs,
  secretMatches,
  QUOTA_FLOOR,
} from "@/lib/premier-core";

describe("frenchTierOf", () => {
  it("reconnaît le Contender", () => {
    expect(frenchTierOf("EU_FRANCE", 21)).toBe("CONTENDER");
  });

  it("reconnaît l'Invite", () => {
    expect(frenchTierOf("EU_FRANCE_SUPER", 22)).toBe("INVITE");
  });

  it("écarte les divisions inférieures", () => {
    expect(frenchTierOf("EU_FRANCE", 20)).toBeNull();
    expect(frenchTierOf("EU_FRANCE", 6)).toBeNull();
  });

  it("écarte les autres conférences, même en division 21", () => {
    expect(frenchTierOf("EU_DACH", 21)).toBeNull();
    expect(frenchTierOf("EU_DACH_SUPER", 22)).toBeNull();
  });

  it("n'accepte pas une conférence française sur la mauvaise division", () => {
    // EU_FRANCE_SUPER n'existe qu'en 22, EU_FRANCE que jusqu'à 21.
    expect(frenchTierOf("EU_FRANCE", 22)).toBeNull();
    expect(frenchTierOf("EU_FRANCE_SUPER", 21)).toBeNull();
  });
});

describe("frenchTiers", () => {
  it("énumère les deux paliers suivis", () => {
    expect(frenchTiers().map((t) => t.tier)).toEqual(["CONTENDER", "INVITE"]);
  });
});

// Fenêtres réelles des saisons 18 et 19, contiguës à la seconde près.
const SAISONS = [
  { id: "s18", startsAt: "2026-06-24T03:15:00Z", endsAt: "2026-08-19T03:15:00Z" },
  { id: "s19", startsAt: "2026-08-19T03:15:00Z", endsAt: "2026-10-14T03:15:00Z" },
];

describe("seasonOfMatch", () => {
  it("attribue le match à la saison dont la fenêtre le contient", () => {
    expect(seasonOfMatch(SAISONS, "2026-09-01T20:00:00Z")).toBe("s19");
    expect(seasonOfMatch(SAISONS, "2026-07-01T20:00:00Z")).toBe("s18");
  });

  it("inclut la borne de début", () => {
    expect(seasonOfMatch(SAISONS, "2026-06-24T03:15:00Z")).toBe("s18");
  });

  it("attribue le basculement à la saison qui commence, pas à celle qui finit", () => {
    // Les deux fenêtres se touchent : sans borne de fin exclue, cet instant
    // appartiendrait aux deux et tomberait dans la plus ancienne.
    expect(seasonOfMatch(SAISONS, "2026-08-19T03:15:00Z")).toBe("s19");
  });

  it("exclut la borne de fin de la dernière saison", () => {
    expect(seasonOfMatch(SAISONS, "2026-10-14T03:15:00Z")).toBeNull();
    expect(seasonOfMatch(SAISONS, "2026-10-14T03:14:59Z")).toBe("s19");
  });

  it("rend null hors de toute fenêtre", () => {
    expect(seasonOfMatch(SAISONS, "2026-06-01T12:00:00Z")).toBeNull();
    expect(seasonOfMatch(SAISONS, "2025-01-01T00:00:00Z")).toBeNull();
  });

  it("rend null sur une date illisible plutôt que de deviner", () => {
    expect(seasonOfMatch(SAISONS, "pas une date")).toBeNull();
    expect(seasonOfMatch(SAISONS, "")).toBeNull();
  });

  it("rend null sans aucune saison connue", () => {
    expect(seasonOfMatch([], "2026-09-01T20:00:00Z")).toBeNull();
  });
});

describe("dedupeMatchIds", () => {
  it("ne garde qu'une occurrence par identifiant", () => {
    // Les deux équipes d'un match le déclarent chacune dans leur historique.
    expect(dedupeMatchIds([["a", "b"], ["b", "c"], ["a"]])).toEqual(["a", "b", "c"]);
  });

  it("préserve l'ordre de première apparition", () => {
    expect(dedupeMatchIds([["z"], ["a"], ["z"]])).toEqual(["z", "a"]);
  });

  it("supporte des historiques vides", () => {
    expect(dedupeMatchIds([])).toEqual([]);
    expect(dedupeMatchIds([[], []])).toEqual([]);
  });
});

describe("seasonNumberOf", () => {
  it("numérote à partir du rang dans la liste", () => {
    expect(seasonNumberOf(["a", "b", "c"], "c")).toBe(3);
    expect(seasonNumberOf(["a", "b", "c"], "a")).toBe(1);
  });

  it("rend null pour une saison absente", () => {
    expect(seasonNumberOf(["a"], "z")).toBeNull();
    expect(seasonNumberOf([], "a")).toBeNull();
  });
});

describe("sideOfRoster", () => {
  // Capture réelle : Blue (roster e4822b92…) bat Red 13-9.
  const teams = [
    { teamId: "Red", won: false, rosterId: "uuid-a", roundsWon: 9, roundsLost: 13 },
    { teamId: "Blue", won: true, rosterId: "uuid-b", roundsWon: 13, roundsLost: 9 },
  ];

  it("place l'équipe A du côté de son roster Premier", () => {
    expect(sideOfRoster(teams, "uuid-b")).toEqual({
      outcomeOfTeamA: "WON",
      roundsA: 13,
      roundsB: 9,
    });
  });

  it("inverse quand l'équipe A est l'autre roster", () => {
    expect(sideOfRoster(teams, "uuid-a")).toEqual({
      outcomeOfTeamA: "LOST",
      roundsA: 9,
      roundsB: 13,
    });
  });

  it("rend null si le roster n'est pas dans le match", () => {
    expect(sideOfRoster(teams, "uuid-inconnu")).toBeNull();
  });

  it("ignore les camps sans roster Premier", () => {
    const sansRoster = [
      { teamId: "Red", won: true, rosterId: null, roundsWon: 13, roundsLost: 4 },
      { teamId: "Blue", won: false, rosterId: null, roundsWon: 4, roundsLost: 13 },
    ];
    expect(sideOfRoster(sansRoster, "uuid-a")).toBeNull();
  });
});

describe("bracketsOf", () => {
  const equipes = (n: number) => Array.from({ length: n }, (_, i) => `t${i + 1}`);

  it("répartit 16 équipes en deux arbres de 8", () => {
    const b = bracketsOf(equipes(16));
    expect(b).toHaveLength(2);
    expect(b[0]).toEqual({ name: "Bracket A", teamIds: equipes(8) });
    expect(b[1].name).toBe("Bracket B");
    expect(b[1].teamIds).toHaveLength(8);
  });

  it("laisse le dernier arbre incomplet plutôt que de le compléter", () => {
    // Compléter avec des équipes fantômes fabriquerait des matchs qui n'ont
    // pas eu lieu.
    const b = bracketsOf(equipes(10));
    expect(b).toHaveLength(2);
    expect(b[1].teamIds).toHaveLength(2);
  });

  it("rend un seul arbre pour l'Invite", () => {
    expect(bracketsOf(equipes(8))).toEqual([{ name: "Bracket A", teamIds: equipes(8) }]);
  });

  it("rend une liste vide sans équipe", () => {
    expect(bracketsOf([])).toEqual([]);
  });
});

describe("tournamentStatusFor", () => {
  const s19 = { id: "s19", startsAt: "2026-08-19T03:15:00Z", endsAt: "2026-10-14T03:15:00Z" };

  it("dit « en cours » pendant la fenêtre", () => {
    expect(tournamentStatusFor(s19, Date.parse("2026-09-01T00:00:00Z"))).toBe("ONGOING");
  });

  it("dit « terminé » après la fin", () => {
    expect(tournamentStatusFor(s19, Date.parse("2026-10-15T00:00:00Z"))).toBe("FINISHED");
  });

  it("dit « à venir » avant le début", () => {
    expect(tournamentStatusFor(s19, Date.parse("2026-08-01T00:00:00Z"))).toBe("UPCOMING");
  });

  it("bascule pile aux bornes", () => {
    expect(tournamentStatusFor(s19, Date.parse("2026-08-19T03:15:00Z"))).toBe("ONGOING");
    expect(tournamentStatusFor(s19, Date.parse("2026-10-14T03:15:00Z"))).toBe("FINISHED");
  });

  it("se rabat sur « en cours » quand les dates sont illisibles", () => {
    // Une saison sans fenêtre exploitable ne doit pas être déclarée terminée :
    // le recalage nocturne des statuts la corrigera si besoin.
    expect(tournamentStatusFor({ id: "x", startsAt: "", endsAt: "" }, 0)).toBe("ONGOING");
  });
});

describe("quotaDelayMs", () => {
  it("n'attend pas tant qu'il reste de la marge", () => {
    expect(quotaDelayMs({ remaining: 29, resetAtMs: 60_000, nowMs: 0 })).toBe(0);
    expect(quotaDelayMs({ remaining: QUOTA_FLOOR + 1, resetAtMs: 60_000, nowMs: 0 })).toBe(0);
  });

  it("attend la remise à zéro annoncée quand la marge est atteinte", () => {
    expect(quotaDelayMs({ remaining: QUOTA_FLOOR, resetAtMs: 60_000, nowMs: 10_000 })).toBe(50_000);
    expect(quotaDelayMs({ remaining: 0, resetAtMs: 60_000, nowMs: 0 })).toBe(60_000);
  });

  it("n'attend plus une fois la remise à zéro passée", () => {
    expect(quotaDelayMs({ remaining: 0, resetAtMs: 60_000, nowMs: 60_000 })).toBe(0);
    expect(quotaDelayMs({ remaining: 0, resetAtMs: 60_000, nowMs: 90_000 })).toBe(0);
  });

  it("n'attend pas quand le quota n'a pas encore été observé", () => {
    // Avant le premier appel, aucun en-tête n'a été vu : attendre à l'aveugle
    // coûterait une minute pour rien.
    expect(quotaDelayMs({ remaining: null, resetAtMs: null, nowMs: 0 })).toBe(0);
    expect(quotaDelayMs({ remaining: 0, resetAtMs: null, nowMs: 0 })).toBe(0);
  });
});

describe("secretMatches", () => {
  it("accepte le bon secret", () => {
    expect(secretMatches("Bearer abc", "abc")).toBe(true);
  });

  it("refuse un mauvais secret de même longueur", () => {
    expect(secretMatches("Bearer xyz", "abc")).toBe(false);
  });

  it("refuse un en-tête absent ou mal formé", () => {
    expect(secretMatches(null, "abc")).toBe(false);
    expect(secretMatches("abc", "abc")).toBe(false);
    expect(secretMatches("Basic abc", "abc")).toBe(false);
  });

  it("refuse quand le secret attendu est vide", () => {
    // Sinon une variable d'environnement oubliée ouvrirait la route à tous.
    expect(secretMatches("Bearer ", "")).toBe(false);
    expect(secretMatches(null, "")).toBe(false);
  });

  it("refuse un secret de longueur différente sans lever", () => {
    expect(secretMatches("Bearer abcdef", "abc")).toBe(false);
    expect(secretMatches("Bearer a", "abc")).toBe(false);
  });
});
