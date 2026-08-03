import { db } from "@/lib/db";
import {
  getCustomMatchById,
  getPlayerCustomMatches,
  RiotIdError,
  type CustomMatch,
} from "@/lib/henrikdev";
import {
  assignSides,
  assignSidesFromCamp,
  computeDerivedStats,
  indexPlayerIdsByPuuid,
  selectSeries,
  type Side,
} from "@/lib/match-stats-core";
import type { MatchMapImportInput } from "@/lib/validation/match";

const MATCH_THRESHOLD = 8;
const MAX_PLAYER_QUERIES = 4;

type Known = { puuid: string; playerId: string; side: Side; region: string; name: string; tag: string };

/** Joueurs (adhésions actives) des 2 équipes ayant un puuid, avec leur côté A/B. */
async function knownPlayers(teamAId: string, teamBId: string): Promise<Known[]> {
  const rows = await db.teamMembership.findMany({
    where: { leaveDate: null, teamId: { in: [teamAId, teamBId] }, player: { puuid: { not: null } } },
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
      puuid: p.puuid, playerId: p.id, side: r.teamId === teamAId ? "A" : "B",
      region: p.region ?? "eu", name: p.riotName, tag: p.riotTag,
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
  return cm.players.map((p) => {
    const d = computeDerivedStats(p, rounds);
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
      firstKills: p.firstKills,
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
    select: { id: true, teamAId: true, teamBId: true, bestOf: true },
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
  for (const k of known.slice(0, MAX_PLAYER_QUERIES)) {
    let list: CustomMatch[] = [];
    try {
      list = await getPlayerCustomMatches(k.region, k.name, k.tag);
    } catch {
      continue;
    }
    for (const m of list) if (m.matchId) byId.set(m.matchId, m);
    const found = selectSeries([...byId.values()], expected, MATCH_THRESHOLD, match.bestOf);
    if (found.length > 0) break;
  }

  const series = selectSeries([...byId.values()], expected, MATCH_THRESHOLD, match.bestOf);
  if (series.length === 0) {
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
          matchId: match.id, mapName: cm.map || "?", scoreA: roundsA, scoreB: roundsB,
          order: i, riotMatchId: cm.matchId, startedAt: cm.startedAt ? new Date(cm.startedAt) : null,
          durationSec: cm.durationSec,
        },
      });
      await tx.playerGameStat.createMany({
        data: gameStatRows(cm, created.id, sideOfTeam, playerIdByPuuid, roundsA + roundsB),
      });
    }
    const winnerId = mapsA > mapsB ? match.teamAId : mapsB > mapsA ? match.teamBId : null;
    await tx.match.update({
      where: { id: match.id },
      data: { scoreA: mapsA, scoreB: mapsB, winnerId, statsStatus: "MATCHED", statsFetchedAt: new Date() },
    });
  });
  return "MATCHED";
}

export type ManualImportResult =
  | "IMPORTED"
  | "DUPLICATE"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "API_ERROR";

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
  input: MatchMapImportInput
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
  try {
    cm = await getCustomMatchById(pickRegion(known), input.riotMatchId);
  } catch (e) {
    if (e instanceof RiotIdError && e.code !== "TAKEN") return e.code;
    return "API_ERROR";
  }

  const playerIdByPuuid = await playerIdsByPuuid(cm.players.map((p) => p.puuid));
  const { sideOfTeam, roundsA, roundsB } =
    input.campOfTeamA === "AUTO"
      ? assignSides(cm, new Map(known.map((k) => [k.puuid, k.side])))
      : assignSidesFromCamp(cm, input.campOfTeamA);

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
    let mapsA = 0;
    let mapsB = 0;
    for (const m of maps) {
      if (m.scoreA > m.scoreB) mapsA += 1;
      else if (m.scoreB > m.scoreA) mapsB += 1;
    }
    await tx.match.update({
      where: { id: match.id },
      data: {
        scoreA: mapsA,
        scoreB: mapsB,
        winnerId: mapsA > mapsB ? match.teamAId : mapsB > mapsA ? match.teamBId : null,
        statsStatus: "MANUAL",
        statsFetchedAt: new Date(),
      },
    });
  });

  return "IMPORTED";
}
