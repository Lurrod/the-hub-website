import { describe, it, expect } from "vitest";
import {
  frenchTierOf,
  frenchTiers,
  seasonOfMatch,
  seasonNumberOf,
  mutualMatchIds,
  sideOfRoster,
  bracketNameFor,
  playoffRounds,
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

describe("mutualMatchIds", () => {
  it("ne garde que les matchs déclarés par deux équipes suivies", () => {
    // Un match dont les deux camps sont dans le périmètre figure dans les deux
    // historiques. Vu une seule fois, l'adversaire est hors périmètre — et le
    // récupérer pour s'en apercevoir coûte deux crédits, à chaque passage.
    expect(mutualMatchIds([["a", "b"], ["b", "c"], ["a"]])).toEqual(["a", "b"]);
  });

  it("écarte un match vu une seule fois", () => {
    expect(mutualMatchIds([["solo"]])).toEqual([]);
  });

  it("ne compte pas deux fois un doublon interne à un historique", () => {
    // Sinon un match répété chez une seule équipe passerait pour un match
    // entre deux équipes suivies.
    expect(mutualMatchIds([["x", "x"]])).toEqual([]);
  });

  it("préserve l'ordre de première apparition", () => {
    expect(
      mutualMatchIds([
        ["z", "a"],
        ["a", "z"],
      ])
    ).toEqual(["z", "a"]);
  });

  it("supporte des historiques vides", () => {
    expect(mutualMatchIds([])).toEqual([]);
    expect(mutualMatchIds([[], []])).toEqual([]);
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

describe("bracketNameFor", () => {
  it("nomme les arbres parallèles par lettre", () => {
    expect(bracketNameFor(0)).toBe("Bracket A");
    expect(bracketNameFor(2)).toBe("Bracket C");
  });

  it("ne sort pas de l'alphabet sur un rang aberrant", () => {
    expect(bracketNameFor(-1)).toBe("Bracket A");
    expect(bracketNameFor(26)).toBe("Bracket Z");
  });
});

describe("playoffRounds", () => {
  // Le championnat d'une saison se joue en arbres parallèles de 8 : le
  // vainqueur d'un arbre dispute donc trois matchs. Comme on suit toute la
  // division, on observe l'arbre entier et sa profondeur est fiable.
  const arbreDeHuit = [
    { tournamentId: "t1", matches: ["qf1", "sf1", "f1"] },
    { tournamentId: "t1", matches: ["qf2", "sf1"] },
    { tournamentId: "t1", matches: ["qf3", "sf2", "f1"] },
    { tournamentId: "t1", matches: ["qf4", "sf2"] },
  ];

  it("nomme les tours d'après la profondeur de l'arbre", () => {
    const r = playoffRounds(arbreDeHuit);
    expect(r.get("qf1")).toEqual({ tournamentId: "t1", roundLabel: "Quarts de finale" });
    expect(r.get("sf1")).toEqual({ tournamentId: "t1", roundLabel: "Demi-finales" });
    expect(r.get("f1")).toEqual({ tournamentId: "t1", roundLabel: "Finale" });
  });

  it("donne le même tour aux deux équipes d'un match", () => {
    const r = playoffRounds(arbreDeHuit);
    expect(r.get("qf4")?.roundLabel).toBe("Quarts de finale");
    expect(r.get("sf2")?.roundLabel).toBe("Demi-finales");
  });

  it("sépare les arbres parallèles", () => {
    const r = playoffRounds([
      { tournamentId: "a", matches: ["m1", "m2"] },
      { tournamentId: "b", matches: ["m3", "m4"] },
    ]);
    expect(r.get("m1")?.tournamentId).toBe("a");
    expect(r.get("m3")?.tournamentId).toBe("b");
    // Deux tours de part et d'autre : demies puis finale.
    expect(r.get("m2")?.roundLabel).toBe("Finale");
    expect(r.get("m4")?.roundLabel).toBe("Finale");
  });

  it("range un match au tour le plus tardif quand deux équipes divergent", () => {
    // Donnée incohérente : mieux vaut un tour que deux.
    const r = playoffRounds([
      { tournamentId: "t", matches: ["x", "y"] },
      { tournamentId: "t", matches: ["y"] },
    ]);
    expect(r.get("y")?.roundLabel).toBe("Finale");
    expect([...r.keys()].filter((k) => k === "y")).toHaveLength(1);
  });

  it("ignore les participations sans match joué", () => {
    expect(playoffRounds([{ tournamentId: "t", matches: [] }]).size).toBe(0);
    expect(playoffRounds([]).size).toBe(0);
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
