/**
 * Jeu de fixtures : une situation de chaque, pour que la CI puisse les tester.
 *
 * Les seeds existants racontent une compétition plausible ; celui-ci raconte
 * les *cas limites*. Il crée un tournoi dédié dont chaque match isole une
 * situation que le site sait produire — série complète, série partiellement
 * stattée, match sans scoreboard, remplaçant, ligne sans fiche joueur…
 *
 * Il tourne **après** `db:seed:formats -- --prune`, qui ne conserve que les
 * tournois qu'il déclare : lancé avant, il serait effacé.
 *
 * Tous les identifiants sont préfixés `fx-` et fixés à la main : les tests
 * doivent pouvoir les citer, et un second passage doit réécrire les mêmes
 * lignes plutôt que d'en créer de nouvelles.
 *
 * Usage : npm run db:seed:fixtures
 */
import { PrismaClient, type MembershipRole, type AccountType } from "@prisma/client";
import { computeRating } from "../src/lib/match-stats-core";

const db = new PrismaClient();

const TID = "fx-tournoi";

/** Rounds d'une map, déduits de son score : c'est ce que le site fait aussi. */
function rounds(scoreA: number, scoreB: number): number {
  return scoreA + scoreB;
}

/**
 * Timeline de rounds cohérente avec le score, pour que la frise du scoreboard
 * ait quelque chose à dessiner.
 */
function timeline(scoreA: number, scoreB: number) {
  const entries: { w: "A" | "B"; o: string }[] = [];
  const outcomes = ["elim", "detonate", "defuse", "time"];
  for (let i = 0; i < scoreA; i++) entries.push({ w: "A", o: outcomes[i % outcomes.length] });
  for (let i = 0; i < scoreB; i++) entries.push({ w: "B", o: outcomes[i % outcomes.length] });
  // Entrelacé plutôt que bloc par bloc : une frise « AAAA…BBBB » ne
  // ressemblerait à aucune partie réelle.
  return entries
    .map((e, i) => ({ e, k: (i * 7) % entries.length }))
    .sort((x, y) => x.k - y.k)
    .map((x) => x.e);
}

/** Une ligne de scoreboard, dont le rating est calculé et non inventé. */
type StatSpec = {
  playerId: string | null;
  riotName: string;
  side: "A" | "B";
  agent: string | null;
  kills: number;
  deaths: number;
  assists: number;
  acs: number;
  adr: number;
  kast: number;
  firstKills: number;
  firstDeaths: number;
  // Faits d'armes : null = carte importée avant leur ajout.
  triples?: number | null;
  quadras?: number | null;
  aces?: number | null;
  clutchWins?: number | null;
  clutchAttempts?: number | null;
  bestClutch?: number | null;
  weaponKills?: Record<string, number> | null;
};

/** Version d'une équipe sans faits d'armes : simule un import antérieur. */
function sansFaitsDarmes(rows: StatSpec[]): StatSpec[] {
  return rows.map((r) => ({
    ...r,
    triples: null,
    quadras: null,
    aces: null,
    clutchWins: null,
    clutchAttempts: null,
    bestClutch: null,
    weaponKills: null,
  }));
}

async function upsertTeam(id: string, name: string, tag: string, logo: string | null) {
  await db.team.upsert({
    where: { id },
    update: { name, tag, logo, region: "France" },
    create: { id, name, tag, logo, region: "France" },
  });
}

async function upsertPlayer(
  id: string,
  pseudo: string,
  extra: {
    accountType?: AccountType;
    valorantRole?: "DUELIST" | "CONTROLLER" | "INITIATOR" | "SENTINEL" | null;
    lft?: boolean;
    nationality?: string | null;
    photo?: string | null;
    socials?: Record<string, string>;
    birthdate?: Date | null;
  } = {}
) {
  const data = {
    pseudo,
    accountType: extra.accountType ?? ("JOUEUR" as AccountType),
    valorantRole: extra.valorantRole ?? null,
    lft: extra.lft ?? false,
    lftSince: extra.lft ? new Date("2026-08-01T00:00:00Z") : null,
    nationality: extra.nationality ?? "France",
    photo: extra.photo ?? null,
    socials: extra.socials ?? undefined,
    birthdate: extra.birthdate ?? null,
    onboardedAt: new Date("2026-07-01T00:00:00Z"),
  };
  await db.player.upsert({ where: { id }, update: data, create: { id, ...data } });
}

async function upsertMembership(
  id: string,
  teamId: string,
  playerId: string,
  role: MembershipRole
) {
  const data = { teamId, playerId, role, joinDate: new Date("2026-07-01T00:00:00Z") };
  await db.teamMembership.upsert({ where: { id }, update: data, create: { id, ...data } });
}

async function upsertMatch(
  id: string,
  m: {
    teamAId: string;
    teamBId: string;
    scoreA: number;
    scoreB: number;
    bestOf: number;
    status: "SCHEDULED" | "LIVE" | "FINISHED";
    round: string;
    date: Date | null;
    hasTime?: boolean;
    withStats: boolean;
  }
) {
  const winnerId =
    m.status === "FINISHED" && m.scoreA !== m.scoreB
      ? m.scoreA > m.scoreB
        ? m.teamAId
        : m.teamBId
      : null;
  const data = {
    tournamentId: TID,
    teamAId: m.teamAId,
    teamBId: m.teamBId,
    scoreA: m.scoreA,
    scoreB: m.scoreB,
    winnerId,
    stage: "BRACKET" as const,
    round: m.round,
    bestOf: m.bestOf,
    status: m.status,
    date: m.date,
    hasTime: m.hasTime ?? false,
    // `statsStatus` commande l'affichage du scoreboard côté fiche match.
    statsStatus: m.withStats ? "MATCHED" : null,
  };
  await db.match.upsert({ where: { id }, update: data, create: { id, ...data } });
}

async function upsertMap(
  id: string,
  matchId: string,
  order: number,
  mapName: string,
  scoreA: number,
  scoreB: number,
  stats: StatSpec[]
) {
  const data = {
    matchId,
    mapName,
    scoreA,
    scoreB,
    order,
    durationSec: 2100 + order * 120,
    startedAt: new Date(`2026-08-0${order + 1}T18:00:00Z`),
    roundTimeline: timeline(scoreA, scoreB),
  };
  await db.matchMap.upsert({ where: { id }, update: data, create: { id, ...data } });

  // Réécrites en bloc : c'est plus simple que de rapprocher ligne à ligne, et
  // le volume est celui d'une poignée de matchs.
  await db.playerGameStat.deleteMany({ where: { matchMapId: id } });
  const r = rounds(scoreA, scoreB);
  await db.playerGameStat.createMany({
    data: stats.map((s) => ({
      matchMapId: id,
      playerId: s.playerId,
      riotName: s.riotName,
      riotTag: "EUW",
      teamSide: s.side,
      agent: s.agent,
      kills: s.kills,
      deaths: s.deaths,
      assists: s.assists,
      acs: s.acs,
      adr: s.adr,
      hsPct: 20 + (s.kills % 15),
      kast: s.kast,
      firstKills: s.firstKills,
      firstDeaths: s.firstDeaths,
      triples: s.triples ?? null,
      quadras: s.quadras ?? null,
      aces: s.aces ?? null,
      clutchWins: s.clutchWins ?? null,
      clutchAttempts: s.clutchAttempts ?? null,
      bestClutch: s.bestClutch ?? null,
      // `?? undefined` et non `?? null` : Prisma refuse null sur un champ Json
      // (DbNull vs JsonNull) ; l'omission laisse simplement la colonne NULL.
      weaponKills: s.weaponKills ?? undefined,
      rating: computeRating({
        rounds: r,
        kills: s.kills,
        deaths: s.deaths,
        assists: s.assists,
        kastPct: s.kast,
        adr: s.adr,
      }),
    })),
  });
}

/** Cinq lignes d'une équipe, calées sur un profil de performance donné. */
function lineup(
  side: "A" | "B",
  players: { id: string | null; riot: string; agent: string | null }[],
  profile: { kills: number; deaths: number; acs: number; adr: number; kast: number }
): StatSpec[] {
  return players.map((p, i) => {
    const kills = profile.kills - i * 2;
    // Faits d'armes dérivés des kills, pour rester déterministes : le premier
    // de l'équipe clutch, les gros scores portent les multikills.
    const clutchWins = i === 0 && kills > 15 ? 1 : 0;
    return {
      playerId: p.id,
      riotName: p.riot,
      side,
      agent: p.agent,
      // Dégradé du meilleur au moins bon, pour que le classement du scoreboard
      // ait quelque chose à trier.
      kills,
      deaths: profile.deaths + i,
      assists: 8 - i,
      acs: profile.acs - i * 12,
      adr: profile.adr - i * 8,
      kast: profile.kast - i * 2,
      firstKills: Math.max(0, 4 - i),
      firstDeaths: i,
      triples: Math.max(0, Math.floor((kills - 12) / 4)),
      quadras: kills >= 19 ? 1 : 0,
      aces: kills >= 20 ? 1 : 0,
      clutchWins,
      clutchAttempts: clutchWins + (i % 2),
      bestClutch: clutchWins > 0 ? (kills % 3) + 1 : 0,
      // Répartition d'armes plausible : le gros du score au fusil (Vandal pour
      // les pairs, Phantom pour les impairs), l'Opérateur au second, un kill
      // au couteau pour le dernier — de quoi peupler chaque carte de la section.
      weaponKills: {
        [i % 2 === 0 ? "Vandal" : "Phantom"]: Math.max(0, kills - 5 - (i === 1 ? 3 : 0)),
        Spectre: 2,
        Classic: 2,
        Sheriff: 1,
        ...(i === 1 ? { Operator: 3 } : {}),
        ...(i === 4 ? { Melee: 1 } : {}),
      },
    };
  });
}

async function main() {
  // --- Équipes -----------------------------------------------------------
  await upsertTeam("fx-team-a", "Fixture Alpha", "FXA", null);
  await upsertTeam("fx-team-b", "Fixture Bravo", "FXB", null);
  // Nom volontairement long : éprouve les troncatures des cartes et des OG.
  await upsertTeam("fx-team-c", "Fixture Charlie Esports Club", "FXC", null);

  // --- Joueurs -----------------------------------------------------------
  const roles = ["DUELIST", "CONTROLLER", "INITIATOR", "SENTINEL", null] as const;
  for (let i = 0; i < 5; i++) {
    await upsertPlayer(`fx-a${i}`, `AlphaJoueur${i}`, {
      valorantRole: roles[i],
      // Le premier porte aussi une date de naissance : c'est la fiche
      // « complète » — drapeau, équipe, rôle, âge et réseaux réunis.
      birthdate: i === 0 ? new Date("2004-03-15T00:00:00Z") : null,
      // Le premier porte les trois réseaux : l'en-tête de fiche doit les
      // aligner avec le pseudo, et c'était invérifiable sans ces données.
      socials:
        i === 0
          ? {
              twitter: "https://x.com/exemple",
              twitch: "https://twitch.tv/exemple",
              discord: "https://discord.gg/exemple",
            }
          : undefined,
    });
    await upsertPlayer(`fx-b${i}`, `BravoJoueur${i}`, { valorantRole: roles[4 - i] });
  }
  // Pseudo long, sans photo ni nationalité : éprouve monogramme et repli.
  await upsertPlayer("fx-long", "JoueurAuPseudoTresTresLong", { nationality: null });
  // Remplaçant : il a un rôle Valorant, mais l'effectif doit le montrer comme
  // remplaçant — c'est le cas qui distinguait mal titulaire et banc.
  await upsertPlayer("fx-sub", "AlphaRemplacant", { valorantRole: "DUELIST" });
  await upsertPlayer("fx-coach", "AlphaCoach", { accountType: "COACH" });
  await upsertPlayer("fx-manager", "AlphaManager", { accountType: "MANAGER" });
  // Encadrement libre : alimente la page LFT et son filtre par type.
  await upsertPlayer("fx-coach-lft", "CoachDisponible", { accountType: "COACH", lft: true });
  await upsertPlayer("fx-manager-lft", "ManagerDisponible", { accountType: "MANAGER", lft: true });
  await upsertPlayer("fx-joueur-lft", "JoueurDisponible", { valorantRole: "SENTINEL", lft: true });

  // --- Effectifs ---------------------------------------------------------
  for (let i = 0; i < 5; i++) {
    await upsertMembership(`fx-mem-a${i}`, "fx-team-a", `fx-a${i}`, "JOUEUR");
    await upsertMembership(`fx-mem-b${i}`, "fx-team-b", `fx-b${i}`, "JOUEUR");
  }
  // Les trois rôles d'encadrement sur la même équipe : un roster qui montre
  // les trois pictogrammes d'un coup.
  await upsertMembership("fx-mem-sub", "fx-team-a", "fx-sub", "SUB");
  await upsertMembership("fx-mem-coach", "fx-team-a", "fx-coach", "COACH");
  await upsertMembership("fx-mem-manager", "fx-team-a", "fx-manager", "MANAGER");
  await upsertMembership("fx-mem-long", "fx-team-c", "fx-long", "JOUEUR");

  // --- Tournoi -----------------------------------------------------------
  const tournoi = {
    name: "Fixtures — cas limites",
    region: "France",
    format: "SINGLE_ELIM" as const,
    status: "ONGOING" as const,
    startDate: new Date("2026-08-01T00:00:00Z"),
    endDate: new Date("2026-08-31T00:00:00Z"),
    bestOf: 3,
    socials: {
      twitter: "https://x.com/exemple",
      twitch: "https://twitch.tv/exemple",
      website: "https://exemple.test",
    },
  };
  await db.tournament.upsert({
    where: { id: TID },
    update: tournoi,
    create: { id: TID, ...tournoi },
  });
  for (const [i, teamId] of ["fx-team-a", "fx-team-b", "fx-team-c"].entries()) {
    await db.tournamentParticipant.upsert({
      where: { id: `fx-part-${i}` },
      update: { tournamentId: TID, teamId },
      create: { id: `fx-part-${i}`, tournamentId: TID, teamId },
    });
  }

  const alpha = [0, 1, 2, 3, 4].map((i) => ({
    id: `fx-a${i}`,
    riot: `AlphaJoueur${i}`,
    agent: ["Jett", "Omen", "Sova", "Killjoy", "Raze"][i],
  }));
  const bravo = [0, 1, 2, 3, 4].map((i) => ({
    id: `fx-b${i}`,
    riot: `BravoJoueur${i}`,
    agent: ["Raze", "Astra", "Breach", "Cypher", "Neon"][i],
  }));

  // --- 1. Bo3 entièrement statté : onglets par map + cumul de série --------
  await upsertMatch("fx-m-bo3", {
    teamAId: "fx-team-a",
    teamBId: "fx-team-b",
    scoreA: 2,
    scoreB: 1,
    bestOf: 3,
    status: "FINISHED",
    round: "Demi-finale",
    date: new Date("2026-08-05T18:00:00Z"),
    hasTime: true,
    withStats: true,
  });
  // Trois maps de longueurs différentes : c'est ce qui rend la pondération par
  // les rounds observable, et donc testable.
  await upsertMap("fx-map-1", "fx-m-bo3", 0, "Ascent", 13, 4, [
    ...lineup("A", alpha, { kills: 20, deaths: 8, acs: 290, adr: 185, kast: 82 }),
    ...lineup("B", bravo, { kills: 10, deaths: 16, acs: 170, adr: 110, kast: 58 }),
  ]);
  // Cette map simule un import antérieur aux faits d'armes : la fiche tournoi
  // doit signaler la donnée partielle sans confondre absence et zéro.
  await upsertMap(
    "fx-map-2",
    "fx-m-bo3",
    1,
    "Bind",
    11,
    13,
    sansFaitsDarmes([
      ...lineup("A", alpha, { kills: 15, deaths: 18, acs: 200, adr: 135, kast: 66 }),
      ...lineup("B", bravo, { kills: 19, deaths: 15, acs: 250, adr: 160, kast: 76 }),
    ])
  );
  // Un remplaçant entre à la place du cinquième : sa moyenne ne doit porter
  // que sur cette map, et le titulaire sortant garde deux maps.
  await upsertMap("fx-map-3", "fx-m-bo3", 2, "Lotus", 13, 11, [
    ...lineup(
      "A",
      [...alpha.slice(0, 4), { id: "fx-sub", riot: "AlphaRemplacant", agent: "Yoru" }],
      {
        kills: 18,
        deaths: 14,
        acs: 240,
        adr: 155,
        kast: 74,
      }
    ),
    ...lineup("B", bravo, { kills: 16, deaths: 17, acs: 215, adr: 140, kast: 70 }),
  ]);

  // --- 2. Bo3 dont une seule map est stattée ------------------------------
  // La carte de série ne doit PAS être proposée, et la map stattée est la
  // deuxième : les numéros suivent le match, pas les maps stattées.
  await upsertMatch("fx-m-partiel", {
    teamAId: "fx-team-a",
    teamBId: "fx-team-c",
    scoreA: 2,
    scoreB: 0,
    bestOf: 3,
    status: "FINISHED",
    round: "Quart de finale",
    date: new Date("2026-08-03T20:00:00Z"),
    hasTime: true,
    withStats: true,
  });
  await upsertMap("fx-partiel-1", "fx-m-partiel", 0, "Split", 13, 9, []);
  await upsertMap("fx-partiel-2", "fx-m-partiel", 1, "Haven", 13, 7, [
    // Lignes sans fiche joueur : le regroupement doit se faire sur le Riot ID,
    // et le nom affiché tomber sur celui-ci. Un agent manquant éprouve le
    // repli du pictogramme.
    ...lineup(
      "A",
      alpha.map((p, i) => (i === 0 ? { id: null, riot: "SansFiche", agent: null } : p)),
      { kills: 19, deaths: 10, acs: 265, adr: 170, kast: 78 }
    ),
    ...lineup("B", bravo, { kills: 12, deaths: 17, acs: 180, adr: 120, kast: 62 }),
  ]);

  // --- 3. Bo1 statté : onglet de map, jamais de cumul ----------------------
  await upsertMatch("fx-m-bo1", {
    teamAId: "fx-team-b",
    teamBId: "fx-team-c",
    scoreA: 1,
    scoreB: 0,
    bestOf: 1,
    status: "FINISHED",
    round: "Barrage",
    date: new Date("2026-08-02T17:00:00Z"),
    withStats: true,
  });
  await upsertMap("fx-bo1-1", "fx-m-bo1", 0, "Sunset", 13, 10, [
    ...lineup("A", bravo, { kills: 18, deaths: 13, acs: 245, adr: 158, kast: 75 }),
    ...lineup("B", alpha, { kills: 14, deaths: 17, acs: 195, adr: 130, kast: 65 }),
  ]);

  // --- 4. Match terminé SANS scoreboard : aucun onglet --------------------
  await upsertMatch("fx-m-sans-stats", {
    teamAId: "fx-team-a",
    teamBId: "fx-team-b",
    scoreA: 2,
    scoreB: 1,
    bestOf: 3,
    status: "FINISHED",
    round: "Poule",
    date: new Date("2026-08-01T19:00:00Z"),
    withStats: false,
  });
  await upsertMap("fx-sans-1", "fx-m-sans-stats", 0, "Icebox", 13, 8, []);
  await upsertMap("fx-sans-2", "fx-m-sans-stats", 1, "Abyss", 9, 13, []);
  await upsertMap("fx-sans-3", "fx-m-sans-stats", 2, "Corrode", 13, 11, []);

  // --- 5. Match à venir : carte « VS », date au lieu du score -------------
  await upsertMatch("fx-m-a-venir", {
    teamAId: "fx-team-a",
    teamBId: "fx-team-c",
    scoreA: 0,
    scoreB: 0,
    bestOf: 5,
    status: "SCHEDULED",
    round: "Finale",
    date: new Date("2026-09-20T19:00:00Z"),
    hasTime: true,
    withStats: false,
  });

  // --- 6. Match en direct -------------------------------------------------
  await upsertMatch("fx-m-live", {
    teamAId: "fx-team-b",
    teamBId: "fx-team-c",
    scoreA: 1,
    scoreB: 1,
    bestOf: 3,
    status: "LIVE",
    round: "Demi-finale",
    date: new Date("2026-08-11T18:00:00Z"),
    hasTime: true,
    withStats: false,
  });

  const stats = await db.playerGameStat.count({
    where: { matchMap: { match: { tournamentId: TID } } },
  });
  process.stdout.write(
    `Fixtures : tournoi ${TID}, 6 matchs, ${stats} lignes de scoreboard.\n` +
      "  bo3 statté · bo3 partiel · bo1 · sans stats · à venir · en direct\n"
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
