import { db } from "@/lib/db";
import { getPlayerCustomMatches, type CustomMatch } from "@/lib/henrikdev";
import { assignSides, computeDerivedStats, selectSeries, type Side } from "@/lib/match-stats-core";

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

async function setStatus(matchId: string, status: string) {
  await db.match.update({ where: { id: matchId }, data: { statsStatus: status } });
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
  const playerIdByPuuid = new Map<string, string>(known.map((k) => [k.puuid, k.playerId]));
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
        },
      });
      await tx.playerGameStat.createMany({
        data: cm.players.map((p) => {
          const rounds = roundsA + roundsB;
          const d = computeDerivedStats(p, rounds);
          return {
            matchMapId: created.id,
            playerId: playerIdByPuuid.get(p.puuid) ?? null,
            riotName: p.name, riotTag: p.tag, puuid: p.puuid || null,
            teamSide: sideOfTeam[p.teamId] ?? "A",
            agent: p.agent, kills: p.kills, deaths: p.deaths, assists: p.assists,
            acs: d.acs, adr: d.adr, hsPct: d.hsPct, firstKills: p.firstKills,
          };
        }),
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
