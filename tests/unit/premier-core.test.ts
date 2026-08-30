import { describe, it, expect } from "vitest";
import {
  frenchTierOf,
  frenchTiers,
  seasonOfMatch,
  seasonNumberOf,
  mutualMatchIds,
  sideOfRoster,
  bracketNameFor,
  actNameFor,
  bestRosterMatch,
  looksLikeSameTeam,
  playoffSeries,
  tournamentStatusFor,
  quotaDelayMs,
  secretMatches,
  cameFromProxy,
  QUOTA_FLOOR,
  premierRecordFingerprint,
  shouldRefreshHistory,
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

describe("playoffSeries", () => {
  // Parcours réel du vice-champion de la saison 16, remis dans l'ordre : deux
  // tours en Bo1 puis une finale en Bo3 perdue 1-2. Les identifiants de partie
  // que rend l'API ne sont PAS dans cet ordre — d'où le tri par heure.
  const NOCORP = "nocorp";
  const jeux = [
    { matchId: "f2", startedAtMs: Date.parse("2026-04-26T19:48Z"), rosterIds: [NOCORP, "rank"] },
    { matchId: "f3", startedAtMs: Date.parse("2026-04-26T20:43Z"), rosterIds: [NOCORP, "rank"] },
    { matchId: "qf", startedAtMs: Date.parse("2026-04-26T17:20Z"), rosterIds: [NOCORP, "flow"] },
    { matchId: "f1", startedAtMs: Date.parse("2026-04-26T19:04Z"), rosterIds: [NOCORP, "rank"] },
    {
      matchId: "sf",
      startedAtMs: Date.parse("2026-04-26T18:14Z"),
      rosterIds: [NOCORP, "fortnite"],
    },
  ] as const;

  it("regroupe la finale Bo3 en une seule série", () => {
    const series = playoffSeries("b1", jeux);
    expect(series).toHaveLength(3);
    expect(series.map((s) => s.matchIds)).toEqual([["qf"], ["sf"], ["f1", "f2", "f3"]]);
  });

  it("nomme les tours d'après la profondeur, pas le nombre de parties", () => {
    const series = playoffSeries("b1", jeux);
    expect(series.map((s) => s.roundLabel)).toEqual(["Quarts de finale", "Demi-finales", "Finale"]);
  });

  it("rend le Bo de chaque série", () => {
    // Riot impose Bo1 partout sauf la finale : le compte de cartes le confirme
    // plutôt que de le supposer.
    expect(playoffSeries("b1", jeux).map((s) => s.bestOf)).toEqual([1, 1, 3]);
  });

  it("porte l'arbre auquel la série appartient", () => {
    expect(playoffSeries("b7", jeux).every((s) => s.bracketId === "b7")).toBe(true);
  });

  it("ne fusionne pas deux rencontres séparées contre le même adversaire", () => {
    // Deux séries distinctes contre la même équipe existent si un autre match
    // s'intercale : les regrouper inventerait un Bo2.
    const series = playoffSeries("b1", [
      { matchId: "a", startedAtMs: 1000, rosterIds: ["x", "y"] },
      { matchId: "b", startedAtMs: 2000, rosterIds: ["x", "z"] },
      { matchId: "c", startedAtMs: 3000, rosterIds: ["x", "y"] },
    ]);
    expect(series.map((s) => s.matchIds)).toEqual([["a"], ["b"], ["c"]]);
  });

  it("supporte un arbre vide", () => {
    expect(playoffSeries("b1", [])).toEqual([]);
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

describe("actNameFor", () => {
  // Ordre réel de `/v1/content` : l'entrée d'année précède ses actes.
  const ACTES = [
    { id: "y26", name: "V26" },
    { id: "a6", name: "ACT VI" },
    { id: "a5", name: "ACT V" },
    { id: "a4", name: "ACT IV" },
    { id: "y25", name: "V25" },
    { id: "a3", name: "ACT III" },
  ];

  it("compose le nom officiel de l'acte avec son année", () => {
    expect(actNameFor(ACTES, "a5")).toBe("V26 Act V");
    expect(actNameFor(ACTES, "a4")).toBe("V26 Act IV");
  });

  it("rattache l'acte à l'année qui le précède, pas à la plus récente", () => {
    expect(actNameFor(ACTES, "a3")).toBe("V25 Act III");
  });

  it("rend null sur un acte inconnu", () => {
    expect(actNameFor(ACTES, "absent")).toBeNull();
    expect(actNameFor([], "a5")).toBeNull();
  });

  it("rend l'acte seul si aucune année ne le précède", () => {
    expect(actNameFor([{ id: "a1", name: "ACT I" }], "a1")).toBe("Act I");
  });
});

describe("bestRosterMatch", () => {
  const roster = ["p1", "p2", "p3", "p4", "p5"];

  it("rattache l'équipe qui partage assez de joueurs", () => {
    const m = bestRosterMatch(roster, [
      { teamId: "t1", puuids: ["p1", "p2", "p3", "x"] },
      { teamId: "t2", puuids: ["p4"] },
    ]);
    expect(m).toEqual({ teamId: "t1", common: 3 });
  });

  it("refuse en dessous du seuil", () => {
    // Deux joueurs en commun, c'est un transfert, pas la même équipe.
    expect(bestRosterMatch(roster, [{ teamId: "t1", puuids: ["p1", "p2"] }])).toBeNull();
  });

  it("prend l'équipe la plus proche quand plusieurs dépassent le seuil", () => {
    const m = bestRosterMatch(roster, [
      { teamId: "t1", puuids: ["p1", "p2", "p3"] },
      { teamId: "t2", puuids: ["p1", "p2", "p3", "p4", "p5"] },
    ]);
    expect(m?.teamId).toBe("t2");
  });

  it("refuse en cas d'égalité parfaite entre deux équipes", () => {
    // Départager au hasard rattacherait la mauvaise fiche, et une fusion
    // erronée se défait très mal.
    const m = bestRosterMatch(roster, [
      { teamId: "t1", puuids: ["p1", "p2", "p3"] },
      { teamId: "t2", puuids: ["p3", "p4", "p5"] },
    ]);
    expect(m).toBeNull();
  });

  it("ignore les doublons de puuid", () => {
    expect(bestRosterMatch(roster, [{ teamId: "t1", puuids: ["p1", "p1", "p1"] }])).toBeNull();
  });

  it("rend null sans candidat ni roster", () => {
    expect(bestRosterMatch(roster, [])).toBeNull();
    expect(bestRosterMatch([], [{ teamId: "t1", puuids: ["p1", "p2", "p3"] }])).toBeNull();
  });
});

describe("looksLikeSameTeam", () => {
  it("reconnaît un nom identique à la casse et aux accents près", () => {
    expect(
      looksLikeSameTeam({ name: "Équipe Alpha", tag: "EA" }, { name: "equipe alpha", tag: "XX" })
    ).toBe(true);
  });

  it("reconnaît un tag identique", () => {
    expect(looksLikeSameTeam({ name: "Alpha", tag: "ALP" }, { name: "Bravo", tag: "alp" })).toBe(
      true
    );
  });

  it("ne rapproche pas deux équipes sans rapport", () => {
    expect(looksLikeSameTeam({ name: "Alpha", tag: "ALP" }, { name: "Bravo", tag: "BRV" })).toBe(
      false
    );
  });

  it("ignore un tag vide", () => {
    // Sans cette garde, toutes les équipes sans tag se ressembleraient.
    expect(looksLikeSameTeam({ name: "Alpha", tag: "" }, { name: "Bravo", tag: "" })).toBe(false);
  });
});

describe("premierRecordFingerprint", () => {
  it("résume un bilan complet", () => {
    expect(premierRecordFingerprint({ wins: 5, losses: 2, score: 340 })).toBe("5-2-340");
  });

  it("distingue deux bilans qui ne diffèrent que par le score", () => {
    // Une victoire en playoffs ne bouge ni `wins` ni `losses` de la saison
    // régulière, mais elle déplace le score : sans lui, l'équipe serait sautée.
    expect(premierRecordFingerprint({ wins: 5, losses: 2, score: 340 })).not.toBe(
      premierRecordFingerprint({ wins: 5, losses: 2, score: 375 })
    );
  });

  it("rend null quand l'API n'a pas donné le bilan", () => {
    // Un bilan absent n'est pas un bilan inchangé : le comparer ferait sauter
    // une équipe qui a peut-être joué.
    expect(premierRecordFingerprint({})).toBeNull();
    expect(premierRecordFingerprint({ wins: 5, losses: 2 })).toBeNull();
  });
});

describe("shouldRefreshHistory", () => {
  it("relit une équipe dont le bilan a bougé", () => {
    expect(shouldRefreshHistory("5-2-340", "4-2-310", false)).toBe(true);
  });

  it("saute une équipe dont le bilan est identique", () => {
    expect(shouldRefreshHistory("5-2-340", "5-2-340", false)).toBe(false);
  });

  it("relit une équipe jamais lue avec succès", () => {
    // `lastSeen` n'est écrit qu'après un historique effectivement obtenu : un
    // appel tombé en échec ne doit pas condamner l'équipe à être sautée.
    expect(shouldRefreshHistory("5-2-340", null, false)).toBe(true);
  });

  it("relit quand le bilan courant n'est pas comparable", () => {
    expect(shouldRefreshHistory(null, "5-2-340", false)).toBe(true);
  });

  it("relit tout le monde en balayage complet", () => {
    // Le balayage quotidien rattrape ce que la comparaison ne voit pas : les
    // participations de playoffs, et les matchs dont l'import avait échoué.
    expect(shouldRefreshHistory("5-2-340", "5-2-340", true)).toBe(true);
  });
});

describe("cameFromProxy", () => {
  const from = (headers: Record<string, string>) => (name: string) => headers[name] ?? null;

  it("est faux sans X-Forwarded-For (aucun proxy en amont)", () => {
    expect(cameFromProxy(from({ authorization: "Bearer x" }))).toBe(false);
  });

  it("est faux quand le dernier maillon est en boucle locale (crontab : XFF posé par Next)", () => {
    // Next remplit X-Forwarded-For depuis l'adresse du socket, même en direct :
    // l'appel local de la crontab porte donc 127.0.0.1 / ::1, à laisser passer.
    expect(cameFromProxy(from({ "x-forwarded-for": "127.0.0.1" }))).toBe(false);
    expect(cameFromProxy(from({ "x-forwarded-for": "::1" }))).toBe(false);
    expect(cameFromProxy(from({ "x-forwarded-for": "::ffff:127.0.0.1" }))).toBe(false);
  });

  it("est vrai quand le dernier maillon est une adresse publique (via Apache)", () => {
    expect(cameFromProxy(from({ "x-forwarded-for": "1.2.3.4" }))).toBe(true);
  });

  it("regarde le dernier maillon, pas le premier : un préfixe menteur ne trompe pas", () => {
    // Apache accole l'adresse réelle en fin de liste ; le client ne contrôle que
    // le début. Un « 127.0.0.1, <ip publique> » reste un appel externe.
    expect(cameFromProxy(from({ "x-forwarded-for": "127.0.0.1, 1.2.3.4" }))).toBe(true);
  });
});
