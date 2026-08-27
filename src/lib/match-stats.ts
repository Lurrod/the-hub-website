import { db } from "@/lib/db";
import {
  getCustomMatchById,
  getPlayerCustomMatches,
  RiotIdError,
  type CustomMatch,
} from "@/lib/henrikdev";
import {
  assignSides,
  assignSidesFromOutcome,
  computeDerivedStats,
  computeHighlights,
  computeImpact,
  computeWeaponKills,
  computeRating,
  indexPlayerIdsByPuuid,
  roundTimeline,
  selectSeries,
  seriesScore,
  type Side,
} from "@/lib/match-stats-core";
import type { MatchMapImportInput } from "@/lib/validation/match";
import { logger, describeError } from "@/lib/logger";

const MATCH_THRESHOLD = 8;
const MAX_PLAYER_QUERIES = 4;

type Known = {
  puuid: string;
  playerId: string;
  side: Side;
  region: string;
  name: string;
  tag: string;
};

/** Joueurs (adhésions actives) des 2 équipes ayant un puuid, avec leur côté A/B. */
async function knownPlayers(teamAId: string, teamBId: string): Promise<Known[]> {
  const rows = await db.teamMembership.findMany({
    where: {
      leaveDate: null,
      teamId: { in: [teamAId, teamBId] },
      player: { puuid: { not: null } },
    },
    select: {
      teamId: true,
      player: { select: { id: true, puuid: true, region: true, riotName: true, riotTag: true } },
    },
  });
  const known: Known[] = [];
  for (const r of rows) {
    const p = r.player;
    if (!p.puuid || !p.riotName || !p.riotTag) continue;
    known.push({
      puuid: p.puuid,
      playerId: p.id,
      side: r.teamId === teamAId ? "A" : "B",
      region: p.region ?? "eu",
      name: p.riotName,
      tag: p.riotTag,
    });
  }
  return known;
}

/**
 * Fiches du site correspondant aux puuid présents dans une partie. La recherche
 * porte sur tous les joueurs, pas seulement sur l'effectif des deux équipes :
 * un remplaçant ou un joueur non encore rostered doit voir ses stats sur sa
 * fiche, sinon elles restent orphelines pour toujours.
 */
async function playerIdsByPuuid(puuids: readonly string[]): Promise<Map<string, string>> {
  const wanted = [...new Set(puuids.filter((p) => p.length > 0))];
  if (wanted.length === 0) return new Map();
  const rows = await db.player.findMany({
    where: { puuid: { in: wanted } },
    select: { id: true, puuid: true },
  });
  return indexPlayerIdsByPuuid(rows);
}

async function setStatus(matchId: string, status: string) {
  await db.match.update({ where: { id: matchId }, data: { statsStatus: status } });
}

/** Lignes de scoreboard d'une partie, prêtes pour un `createMany`. */
function gameStatRows(
  cm: CustomMatch,
  matchMapId: string,
  sideOfTeam: Record<string, Side>,
  playerIdByPuuid: Map<string, string>,
  rounds: number
) {
  // Le nombre de rounds joués fait foi pour le KAST : les duels ne portent que
  // les rounds où quelqu'un est mort, un round « sec » compterait sinon en moins.
  const roundCount = cm.rounds.length > 0 ? cm.rounds.length : rounds;
  const impact = computeImpact(
    cm.kills,
    cm.players.map((p) => p.puuid),
    roundCount
  );
  // Sans liste de duels, pas de multikills ni de clutchs : les colonnes
  // restent nulles plutôt que d'écrire des zéros qui se liraient comme un
  // tournoi sans le moindre clutch.
  const highlights =
    cm.kills.length > 0 ? computeHighlights(cm.kills, cm.players, cm.rounds) : null;
  const weaponKills =
    cm.kills.length > 0
      ? computeWeaponKills(
          cm.kills,
          cm.players.map((p) => p.puuid)
        )
      : null;

  return cm.players.map((p) => {
    const d = computeDerivedStats(p, rounds);
    const i = impact.get(p.puuid);
    const h = highlights?.get(p.puuid) ?? null;
    const kast = roundCount > 0 ? Math.round(((i?.kastRounds ?? 0) / roundCount) * 100) : 0;
    return {
      matchMapId,
      playerId: playerIdByPuuid.get(p.puuid) ?? null,
      riotName: p.name,
      riotTag: p.tag,
      puuid: p.puuid || null,
      teamSide: sideOfTeam[p.teamId] ?? "A",
      agent: p.agent,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      acs: d.acs,
      adr: d.adr,
      hsPct: d.hsPct,
      kast,
      firstKills: i?.firstKills ?? 0,
      firstDeaths: i?.firstDeaths ?? 0,
      triples: h?.triples ?? null,
      quadras: h?.quadras ?? null,
      aces: h?.aces ?? null,
      clutchWins: h?.clutchWins ?? null,
      clutchAttempts: h?.clutchAttempts ?? null,
      bestClutch: h?.bestClutch ?? null,
      weaponKills: weaponKills?.get(p.puuid) ?? undefined,
      rating: computeRating({
        rounds: roundCount,
        kills: p.kills,
        deaths: p.deaths,
        assists: p.assists,
        kastPct: kast,
        adr: d.adr,
      }),
    };
  });
}

/**
 * Récupère les parties custom d'un match validé et remplace ses cartes/scores +
 * scoreboards. Idempotent. Ne lève jamais : renvoie un statut.
 */
export async function fetchAndStoreMatchStats(matchId: string): Promise<"MATCHED" | "NOT_FOUND"> {
  const match = await db.match.findUnique({
    where: { id: matchId },
    select: { id: true, teamAId: true, teamBId: true, bestOf: true, date: true },
  });
  if (!match) return "NOT_FOUND";

  const known = await knownPlayers(match.teamAId, match.teamBId);
  const expected = new Set(known.map((k) => k.puuid));
  const puuidToSide = new Map<string, Side>(known.map((k) => [k.puuid, k.side]));
  if (expected.size < MATCH_THRESHOLD) {
    await setStatus(match.id, "NOT_FOUND");
    return "NOT_FOUND";
  }

  const byId = new Map<string, CustomMatch>();
  // Une interrogation qui échoue est simplement sautée — un joueur injoignable
  // ne doit pas condamner l'import. Mais si TOUTES échouent, le résultat est
  // un « NOT_FOUND » indiscernable d'un match qui n'existe pas : on compte les
  // échecs pour pouvoir le dire.
  const interrogations = known.slice(0, MAX_PLAYER_QUERIES);
  let echecs = 0;
  for (const k of interrogations) {
    let list: CustomMatch[] = [];
    try {
      list = await getPlayerCustomMatches(k.region, k.name, k.tag);
    } catch (e) {
      echecs += 1;
      logger.warn("match-stats.player_query_failed", {
        matchId,
        riotName: `${k.name}#${k.tag}`,
        ...describeError(e),
      });
      continue;
    }
    for (const m of list) if (m.matchId) byId.set(m.matchId, m);
    const found = selectSeries(
      [...byId.values()],
      expected,
      MATCH_THRESHOLD,
      match.bestOf,
      match.date
    );
    if (found.length > 0) break;
  }

  const series = selectSeries(
    [...byId.values()],
    expected,
    MATCH_THRESHOLD,
    match.bestOf,
    match.date
  );
  if (series.length === 0) {
    // Aucune interrogation n'a abouti : le match n'est pas « introuvable », on
    // n'a simplement pas pu chercher. Sans cette distinction, une panne de
    // l'API se lit comme un match inexistant, et on relance l'import en boucle
    // en cherchant l'erreur du mauvais côté.
    if (echecs > 0 && echecs === interrogations.length) {
      logger.error("match-stats.all_queries_failed", {
        matchId,
        interrogations: interrogations.length,
      });
    }
    await setStatus(match.id, "NOT_FOUND");
    return "NOT_FOUND";
  }

  const playerIdByPuuid = await playerIdsByPuuid(
    series.flatMap((cm) => cm.players.map((p) => p.puuid))
  );

  let mapsA = 0;
  let mapsB = 0;
  await db.$transaction(async (tx) => {
    await tx.matchMap.deleteMany({ where: { matchId: match.id } });
    for (let i = 0; i < series.length; i++) {
      const cm = series[i];
      const { sideOfTeam, roundsA, roundsB } = assignSides(cm, puuidToSide);
      if (roundsA > roundsB) mapsA += 1;
      else if (roundsB > roundsA) mapsB += 1;

      const created = await tx.matchMap.create({
        data: {
          matchId: match.id,
          mapName: cm.map || "?",
          scoreA: roundsA,
          scoreB: roundsB,
          order: i,
          riotMatchId: cm.matchId,
          startedAt: cm.startedAt ? new Date(cm.startedAt) : null,
          durationSec: cm.durationSec,
          roundTimeline: roundTimeline(cm.rounds, sideOfTeam),
        },
      });
      await tx.playerGameStat.createMany({
        data: gameStatRows(cm, created.id, sideOfTeam, playerIdByPuuid, roundsA + roundsB),
      });
    }
    const winnerId = mapsA > mapsB ? match.teamAId : mapsB > mapsA ? match.teamBId : null;
    await tx.match.update({
      where: { id: match.id },
      data: {
        scoreA: mapsA,
        scoreB: mapsB,
        winnerId,
        statsStatus: "MATCHED",
        statsFetchedAt: new Date(),
      },
    });
  });
  return "MATCHED";
}

export type ManualImportResult =
  | "IMPORTED"
  | "DUPLICATE"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "API_ERROR"
  /** Map nulle : « a gagné / a perdu » n'y départage pas les camps. */
  | "NO_WINNER";

/** Région à interroger : celle des joueurs liés, `eu` à défaut. */
function pickRegion(known: Known[]): string {
  return known[0]?.region ?? "eu";
}

/**
 * Importe une map à partir de son identifiant de partie Riot, saisi par un
 * admin quand la recherche automatique n'a rien trouvé. La map s'ajoute à la
 * suite de celles déjà présentes, puis le score du match est recalculé sur
 * l'ensemble des maps. Idempotent : un identifiant déjà importé est refusé.
 */
export async function importMatchMapFromRiotId(
  matchId: string,
  input: MatchMapImportInput,
  /**
   * Partie déjà récupérée par l'appelant.
   *
   * La synchronisation Premier doit lire le match **avant** d'appeler cette
   * fonction : c'est `premier_roster` qui lui dit quelle équipe est A. Le
   * relire ici doublait sa consommation de quota pour exactement la même
   * donnée — 250 appels au lieu de 125 sur un import de deux saisons.
   */
  dejaRecuperee?: CustomMatch
): Promise<ManualImportResult> {
  const match = await db.match.findUnique({
    where: { id: matchId },
    select: { id: true, teamAId: true, teamBId: true },
  });
  if (!match) return "NOT_FOUND";

  const already = await db.matchMap.findUnique({
    where: { riotMatchId: input.riotMatchId },
    select: { id: true },
  });
  if (already) return "DUPLICATE";

  const known = await knownPlayers(match.teamAId, match.teamBId);

  let cm: CustomMatch;
  if (dejaRecuperee) {
    cm = dejaRecuperee;
  } else {
    try {
      cm = await getCustomMatchById(pickRegion(known), input.riotMatchId);
    } catch (e) {
      if (e instanceof RiotIdError && e.code !== "TAKEN") return e.code;
      return "API_ERROR";
    }
  }

  const playerIdByPuuid = await playerIdsByPuuid(cm.players.map((p) => p.puuid));
  const assigned =
    input.outcomeOfTeamA === "AUTO"
      ? assignSides(cm, new Map(known.map((k) => [k.puuid, k.side])))
      : assignSidesFromOutcome(cm, input.outcomeOfTeamA === "WON");
  // Refuser plutôt qu'inverser en silence : sur une map nulle, le résultat
  // annoncé ne dit pas quel camp est l'équipe A.
  if (!assigned) return "NO_WINNER";
  const { sideOfTeam, roundsA, roundsB } = assigned;

  await db.$transaction(async (tx) => {
    const order = await tx.matchMap.count({ where: { matchId: match.id } });
    const created = await tx.matchMap.create({
      data: {
        matchId: match.id,
        mapName: cm.map || "?",
        scoreA: roundsA,
        scoreB: roundsB,
        order,
        riotMatchId: cm.matchId || input.riotMatchId,
        startedAt: cm.startedAt ? new Date(cm.startedAt) : null,
        durationSec: cm.durationSec,
        roundTimeline: roundTimeline(cm.rounds, sideOfTeam),
      },
    });
    await tx.playerGameStat.createMany({
      data: gameStatRows(cm, created.id, sideOfTeam, playerIdByPuuid, roundsA + roundsB),
    });

    // Le score du match se relit sur toutes les maps, pas seulement celle qu'on
    // vient d'ajouter : l'import est incrémental et peut compléter une série
    // déjà partiellement saisie à la main.
    const maps = await tx.matchMap.findMany({
      where: { matchId: match.id },
      select: { scoreA: true, scoreB: true },
    });
    const { scoreA, scoreB } = seriesScore(maps);
    await tx.match.update({
      where: { id: match.id },
      data: {
        scoreA,
        scoreB,
        winnerId: scoreA > scoreB ? match.teamAId : scoreB > scoreA ? match.teamBId : null,
        statsStatus: "MANUAL",
        statsFetchedAt: new Date(),
      },
    });
  });

  return "IMPORTED";
}
