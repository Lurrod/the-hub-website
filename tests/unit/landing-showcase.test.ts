import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Aperçus de la page d'accueil.
 *
 * Ce qui est vérifié ici n'est pas « la requête rend quelque chose » mais les
 * quelques décisions que le typage laisse passer sans broncher : quel camp du
 * scoreboard on montre, quel bout de la courbe de rating, quels tours d'un
 * bracket se suivent réellement, et le fait qu'une base en panne coûte un
 * aperçu et non la page entière.
 */

// Volontairement sans implémentation : une valeur de retour par défaut ferait
// inférer `never[]`, et `mockResolvedValue` refuserait ensuite tout objet.
// Les valeurs de base sont posées dans `beforeEach`.
const db = {
  matchMap: { findFirst: vi.fn() },
  match: { findFirst: vi.fn() },
  player: { findUnique: vi.fn(), findMany: vi.fn() },
  team: { findMany: vi.fn() },
  tournament: { findMany: vi.fn() },
  $queryRaw: vi.fn(),
};
vi.mock("@/lib/db", () => ({ db }));

const getPlayerOverview = vi.fn();
vi.mock("@/lib/data/player-overview", () => ({ getPlayerOverview }));

const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
vi.mock("@/lib/logger", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/logger")>()),
  logger,
}));

const {
  getShowcaseScoreboard,
  getShowcasePlayer,
  getShowcaseTournament,
  getShowcaseAds,
  getShowcaseData,
} = await import("@/lib/data/landing-showcase");

const team = (tag: string) => ({ tag, name: tag, logo: null });

/** Ligne de scoreboard : seuls le camp et le rating comptent pour ces tests. */
const stat = (teamSide: string, riotName: string, rating: number) => ({
  teamSide,
  riotName,
  rating,
  agent: "Jett",
  kills: 1,
  deaths: 1,
  assists: 1,
  acs: 1,
  adr: 1,
  kast: 1,
  player: null,
});

beforeEach(() => {
  vi.clearAllMocks();
  db.player.findMany.mockResolvedValue([]);
  db.team.findMany.mockResolvedValue([]);
  db.tournament.findMany.mockResolvedValue([]);
  db.match.findFirst.mockResolvedValue(null);
  db.$queryRaw.mockResolvedValue([]);
});

describe("getShowcaseScoreboard", () => {
  const map = (over: Partial<Record<string, unknown>> = {}) => ({
    order: 1,
    mapName: "Ascent",
    scoreA: 13,
    scoreB: 9,
    match: {
      id: "m1",
      teamA: team("AAA"),
      teamB: team("BBB"),
      _count: { maps: 3 },
    },
    stats: [stat("A", "a1", 1.1), stat("B", "b1", 1.9), stat("A", "a2", 1.5), stat("B", "b2", 1.8)],
    ...over,
  });

  it("ne montre que le camp qui a gagné la carte, du meilleur au moins bon", async () => {
    db.matchMap.findFirst.mockResolvedValue(map());

    const s = await getShowcaseScoreboard();

    // A mène 13-9 : les lignes de B, mieux notées, ne doivent pas apparaître.
    expect(s?.lines.map((l) => l.pseudo)).toEqual(["a2", "a1"]);
  });

  it("bascule sur l'autre camp quand c'est lui qui l'emporte", async () => {
    db.matchMap.findFirst.mockResolvedValue(map({ scoreA: 7, scoreB: 13 }));

    const s = await getShowcaseScoreboard();

    expect(s?.lines.map((l) => l.pseudo)).toEqual(["b1", "b2"]);
  });

  it("compte les cartes à partir de 1, là où la base part de 0", async () => {
    db.matchMap.findFirst.mockResolvedValue(map());

    const s = await getShowcaseScoreboard();

    expect(s?.mapIndex).toBe(2);
    expect(s?.mapCount).toBe(3);
  });

  it("se tait quand le camp vainqueur n'a aucune ligne", async () => {
    db.matchMap.findFirst.mockResolvedValue(map({ stats: [stat("B", "b1", 1.2)] }));

    expect(await getShowcaseScoreboard()).toBeNull();
  });

  it("rend null, et trace, quand la base tombe", async () => {
    db.matchMap.findFirst.mockRejectedValue(new Error("connexion perdue"));

    expect(await getShowcaseScoreboard()).toBeNull();
    expect(logger.error).toHaveBeenCalledWith("landing.scoreboard", expect.anything());
  });
});

describe("getShowcasePlayer", () => {
  const overview = (trend: number[]) => ({
    maps: trend.length,
    kills: 10,
    deaths: 5,
    kd: 2,
    topAgent: { agent: "Jett", maps: 3, pct: 40 },
    bestGame: {
      matchId: "m",
      kills: 30,
      deaths: 1,
      assists: 1,
      mapName: "Ascent",
      agent: null,
      opponentTag: "XXX",
    },
    agents: [],
    agentsOther: null,
    mapRecords: [],
    // `ratingTrend` rend l'ordre chronologique : la plus ancienne d'abord.
    trend: trend.map((rating, i) => ({ matchId: `m${i}`, label: "", rating, win: true })),
    avgRating: 1,
    avgAcs: 1,
    avgKast: 1,
    avgHs: 1,
    firstKills: 1,
    firstDeaths: 1,
  });

  const player = {
    id: "p1",
    pseudo: "sylk",
    photo: null,
    nationality: "France",
    valorantRole: "DUELIST",
    accountType: "JOUEUR",
    birthdate: null,
    memberships: [],
  };

  it("garde les DERNIÈRES cartes de la courbe, pas les premières", async () => {
    db.$queryRaw.mockResolvedValue([{ id: "p1" }]);
    db.player.findUnique.mockResolvedValue(player);
    // 15 points chronologiques : la courbe doit finir sur 15, pas sur 12.
    getPlayerOverview.mockResolvedValue(
      overview([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
    );

    const p = await getShowcasePlayer();

    expect(p?.trend).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  });

  it("remplace le rôle Valorant manquant par le type de compte", async () => {
    db.$queryRaw.mockResolvedValue([{ id: "p1" }]);
    db.player.findUnique.mockResolvedValue({ ...player, valorantRole: null, accountType: "COACH" });
    getPlayerOverview.mockResolvedValue(overview([1, 2]));

    expect((await getShowcasePlayer())?.qualifier).toBe("Coach");
  });

  it("se tait quand personne n'atteint le plancher de cartes", async () => {
    db.$queryRaw.mockResolvedValue([]);

    expect(await getShowcasePlayer()).toBeNull();
  });
});

describe("getShowcaseTournament", () => {
  const bout = (
    id: string,
    round: string,
    a: string,
    b: string,
    scoreA: number,
    scoreB: number
  ) => ({
    id,
    round,
    bracketPosition: null,
    scoreA,
    scoreB,
    winnerId: scoreA > scoreB ? a : b,
    teamAId: a,
    teamBId: b,
    teamA: team(a),
    teamB: team(b),
  });

  const tournament = (matches: unknown[], format = "DOUBLE_ELIM") => ({
    id: "t1",
    name: "Hub Masters",
    logo: null,
    format,
    status: "ONGOING",
    prizePool: "500 €",
    _count: { participants: 8 },
    matches,
  });

  it("enchaîne deux tours qui se suivent vraiment, sans mélanger les brackets", async () => {
    db.tournament.findMany.mockResolvedValue([
      tournament([
        bout("l1", "LB Round 1", "GGG", "HHH", 2, 0),
        bout("l2", "LB Round 1", "III", "JJJ", 2, 1),
        bout("s1", "UB Demi-finales", "AAA", "BBB", 2, 0),
        bout("s2", "UB Demi-finales", "CCC", "DDD", 1, 2),
        bout("f1", "UB Finale", "AAA", "DDD", 3, 1),
      ]),
    ]);

    const t = await getShowcaseTournament();

    // Le tri alphabétique des libellés plaçait « LB Round 1 » avant « UB
    // Quarts… » et faisait dessiner une progression inexistante.
    expect(t?.semisLabel.toLowerCase()).not.toContain("lb");
    expect(t?.semis).toHaveLength(2);
    // Les deux vainqueurs des demies sont bien les deux finalistes.
    const finalists = [t?.final?.top.tag, t?.final?.bottom.tag];
    expect(finalists).toContain("AAA");
    expect(finalists).toContain("DDD");
  });

  it("passe au tournoi suivant quand le bracket n'a pas de quoi se dessiner", async () => {
    db.tournament.findMany.mockResolvedValue([
      tournament([bout("f1", "Finale", "AAA", "BBB", 2, 0)], "SINGLE_ELIM"),
      tournament(
        [
          bout("s1", "Demi-finales", "AAA", "BBB", 2, 0),
          bout("s2", "Demi-finales", "CCC", "DDD", 2, 1),
          bout("f1", "Finale", "AAA", "CCC", 3, 0),
        ],
        "SINGLE_ELIM"
      ),
    ]);

    const t = await getShowcaseTournament();

    expect(t).not.toBeNull();
    expect(t?.semis).toHaveLength(2);
  });

  it("se tait quand aucun tournoi n'a de bracket exploitable", async () => {
    db.tournament.findMany.mockResolvedValue([tournament([])]);

    expect(await getShowcaseTournament()).toBeNull();
  });
});

describe("getShowcaseAds", () => {
  it("entremêle joueurs et équipes, les plus récentes annonces d'abord", async () => {
    db.player.findMany.mockResolvedValue([
      {
        id: "p1",
        pseudo: "sylk",
        lftSince: new Date("2026-08-10"),
        nationality: "France",
        valorantRole: "DUELIST",
        accountType: "JOUEUR",
        memberships: [],
      },
    ]);
    db.team.findMany.mockResolvedValue([
      {
        id: "t1",
        name: "Nordique",
        tag: "NRD",
        logo: null,
        lfpSince: new Date("2026-08-11"),
        lfpRoles: ["SENTINEL"],
        lfpMessage: null,
        region: "EU",
      },
    ]);

    const ads = await getShowcaseAds();

    expect(ads?.map((a) => a.kind)).toEqual(["LFP", "LFT"]);
    expect(ads?.[0].facts[0]).toBe("Cherche Sentinelle");
    // `since` n'a servi qu'au tri : il ne doit pas fuiter dans l'affichage.
    expect(ads?.[0]).not.toHaveProperty("since");
  });

  it("dit « ouvert à tous les rôles » quand l'équipe n'en précise aucun", async () => {
    db.team.findMany.mockResolvedValue([
      {
        id: "t1",
        name: "Nordique",
        tag: "NRD",
        logo: null,
        lfpSince: null,
        lfpRoles: [],
        lfpMessage: null,
        region: "EU",
      },
    ]);

    expect((await getShowcaseAds())?.[0].facts).toContain("Ouvert à tous les rôles");
  });

  it("se tait quand personne ne cherche", async () => {
    expect(await getShowcaseAds()).toBeNull();
  });
});

describe("getShowcaseData", () => {
  it("rend les quatre aperçus à null plutôt que d'échouer quand tout est vide", async () => {
    db.matchMap.findFirst.mockResolvedValue(null);

    expect(await getShowcaseData()).toEqual({
      scoreboard: null,
      player: null,
      tournament: null,
      ads: null,
    });
  });
});
