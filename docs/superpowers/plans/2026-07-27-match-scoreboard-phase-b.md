# Match Scoreboard (Phase B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** À la validation d'un match (`FINISHED`), retrouver automatiquement la/les partie(s) custom Valorant via HenrikDev, apparier ≥8/10 joueurs par `puuid`, et remplacer les cartes/scores par les données Riot en stockant un scoreboard complet par joueur et par carte.

**Architecture:** Le client HenrikDev produit un type NORMALISÉ `CustomMatch` (isole l'incertitude sur les noms de champs de l'API). Un module PUR `match-stats-core.ts` (appariement, côtés A/B, calculs ACS/ADR/HS%) est testé unitairement. Un orchestrateur `match-stats.ts` combine client + core + écriture DB idempotente en transaction. Le déclencheur est dans `updateMatchAction` (try/catch, ne casse jamais la validation).

**Tech Stack:** Next.js 16 (server actions), Prisma/PostgreSQL, Vitest, TypeScript strict.

**⚠️ Incertitude API :** les noms de champs de l'API v4 HenrikDev doivent être confirmés contre une vraie réponse (docs.henrikdev.xyz ou un appel réel avec la clé). Le client (Task 1) mappe de façon TOLÉRANTE avec des défauts sûrs. Le mapping fourni ci-dessous suit la structure v4 documentée ; si un champ diffère, l'ajuster dans le client uniquement — le core et le reste ne dépendent que du type normalisé.

---

## File Structure

- **Modify** `src/lib/henrikdev.ts` — ajout `getPlayerCustomMatches` + types normalisés.
- **Create** `tests/unit/henrikdev-matches.test.ts`.
- **Create** `src/lib/match-stats-core.ts` — logique pure (types + fonctions).
- **Create** `tests/unit/match-stats-core.test.ts`.
- **Modify** `prisma/schema.prisma` + **Create** migration — `MatchMap` étendu, `PlayerGameStat`, `Match` étendu.
- **Create** `src/lib/match-stats.ts` — orchestrateur `fetchAndStoreMatchStats` (impur).
- **Modify** `src/app/admin/actions/matches.ts` — déclencheur.
- **Modify** `src/app/tournois/[id]/gestion/matchs/[matchId]/page.tsx` — indicateur `statsStatus`.

---

## Task 1: Client `getPlayerCustomMatches` + types normalisés

**Files:**
- Modify: `src/lib/henrikdev.ts`
- Test: `tests/unit/henrikdev-matches.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/henrikdev-matches.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { getPlayerCustomMatches } from "@/lib/henrikdev";

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    status, ok: status >= 200 && status < 300, json: async () => body,
  } as Response);
}
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

const rawMatch = {
  metadata: { match_id: "m1", map: { name: "Ascent" }, started_at: "2026-07-27T20:00:00Z" },
  teams: [
    { team_id: "Red", rounds: { won: 13, lost: 9 } },
    { team_id: "Blue", rounds: { won: 9, lost: 13 } },
  ],
  players: [
    {
      puuid: "p1", name: "Zed", tag: "EUW", team_id: "Red", agent: { name: "Jett" },
      stats: { kills: 20, deaths: 12, assists: 5, score: 4400, headshots: 30, bodyshots: 60, legshots: 10, damage: { dealt: 3300 } },
    },
  ],
};

describe("getPlayerCustomMatches", () => {
  it("mappe la réponse v4 vers CustomMatch normalisé", async () => {
    vi.stubEnv("HENRIKDEV_API_KEY", "k");
    vi.stubGlobal("fetch", mockFetch(200, { data: [rawMatch] }));
    const out = await getPlayerCustomMatches("eu", "Zed", "EUW");
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      matchId: "m1", map: "Ascent", startedAt: "2026-07-27T20:00:00Z",
      teamRounds: { Red: 13, Blue: 9 },
    });
    expect(out[0].players[0]).toMatchObject({
      puuid: "p1", teamId: "Red", agent: "Jett", kills: 20, deaths: 12, assists: 5,
      score: 4400, headshots: 30, bodyshots: 60, legshots: 10, damageMade: 3300, firstKills: 0,
    });
  });
  it("retourne [] si data absent", async () => {
    vi.stubEnv("HENRIKDEV_API_KEY", "k");
    vi.stubGlobal("fetch", mockFetch(200, {}));
    expect(await getPlayerCustomMatches("eu", "x", "yyy")).toEqual([]);
  });
  it("429 -> RATE_LIMITED", async () => {
    vi.stubEnv("HENRIKDEV_API_KEY", "k");
    vi.stubGlobal("fetch", mockFetch(429, {}));
    await expect(getPlayerCustomMatches("eu", "x", "yyy")).rejects.toMatchObject({ code: "RATE_LIMITED" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/henrikdev-matches.test.ts` — expect FAIL (export missing).

- [ ] **Step 3: Add types + function to `src/lib/henrikdev.ts`** (append, keep existing exports)

```ts
export type CustomMatchPlayer = {
  puuid: string;
  name: string;
  tag: string | null;
  teamId: string; // "Red" | "Blue" (brut Riot)
  agent: string | null;
  kills: number;
  deaths: number;
  assists: number;
  score: number;
  headshots: number;
  bodyshots: number;
  legshots: number;
  damageMade: number;
  firstKills: number;
};

export type CustomMatch = {
  matchId: string;
  map: string;
  startedAt: string | null;
  teamRounds: Record<string, number>; // team_id -> rounds gagnés
  players: CustomMatchPlayer[];
};

const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/**
 * Historique des parties CUSTOM d'un joueur, mappé vers CustomMatch normalisé.
 * NOTE: les noms de champs de l'API v4 sont mappés ici de façon tolérante ;
 * ajuster UNIQUEMENT cette fonction si l'API réelle diffère.
 */
export async function getPlayerCustomMatches(
  region: string,
  name: string,
  tag: string
): Promise<CustomMatch[]> {
  const key = process.env.HENRIKDEV_API_KEY;
  if (!key) throw new RiotIdError("API_ERROR");

  const url =
    `${BASE}/valorant/v4/matches/${encodeURIComponent(region)}/pc/` +
    `${encodeURIComponent(name)}/${encodeURIComponent(tag)}?mode=custom&size=10`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  let res: Response;
  try {
    res = await fetch(url, { headers: { Authorization: key }, signal: controller.signal });
  } catch {
    throw new RiotIdError("API_ERROR");
  } finally {
    clearTimeout(timeout);
  }
  if (res.status === 429) throw new RiotIdError("RATE_LIMITED");
  if (!res.ok) throw new RiotIdError("API_ERROR");

  const json = (await res.json().catch(() => null)) as { data?: unknown[] } | null;
  const list = Array.isArray(json?.data) ? json!.data : [];
  return list.map(mapRawCustomMatch);
}

function mapRawCustomMatch(raw: unknown): CustomMatch {
  const m = raw as {
    metadata?: { match_id?: string; map?: { name?: string }; started_at?: string };
    teams?: { team_id?: string; rounds?: { won?: number } }[];
    players?: {
      puuid?: string; name?: string; tag?: string; team_id?: string;
      agent?: { name?: string };
      stats?: {
        kills?: number; deaths?: number; assists?: number; score?: number;
        headshots?: number; bodyshots?: number; legshots?: number;
        damage?: { dealt?: number };
      };
    }[];
  };
  const teamRounds: Record<string, number> = {};
  for (const t of m.teams ?? []) {
    if (t.team_id) teamRounds[t.team_id] = num(t.rounds?.won);
  }
  const players: CustomMatchPlayer[] = (m.players ?? []).map((p) => ({
    puuid: p.puuid ?? "",
    name: p.name ?? "",
    tag: p.tag ?? null,
    teamId: p.team_id ?? "",
    agent: p.agent?.name ?? null,
    kills: num(p.stats?.kills),
    deaths: num(p.stats?.deaths),
    assists: num(p.stats?.assists),
    score: num(p.stats?.score),
    headshots: num(p.stats?.headshots),
    bodyshots: num(p.stats?.bodyshots),
    legshots: num(p.stats?.legshots),
    damageMade: num(p.stats?.damage?.dealt),
    firstKills: 0,
  }));
  return {
    matchId: m.metadata?.match_id ?? "",
    map: m.metadata?.map?.name ?? "",
    startedAt: m.metadata?.started_at ?? null,
    teamRounds,
    players,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/henrikdev-matches.test.ts` — expect PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/henrikdev.ts tests/unit/henrikdev-matches.test.ts
git commit -m "feat: add HenrikDev custom match history client (normalized)"
```

---

## Task 2: Logique pure `match-stats-core.ts`

**Files:**
- Create: `src/lib/match-stats-core.ts`
- Test: `tests/unit/match-stats-core.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/match-stats-core.test.ts
import { describe, it, expect } from "vitest";
import {
  countExpected, assignSides, computeDerivedStats, selectSeries,
} from "@/lib/match-stats-core";
import type { CustomMatch, CustomMatchPlayer } from "@/lib/henrikdev";

function player(puuid: string, teamId: string): CustomMatchPlayer {
  return {
    puuid, name: puuid, tag: "EUW", teamId, agent: "Jett",
    kills: 0, deaths: 0, assists: 0, score: 0,
    headshots: 0, bodyshots: 0, legshots: 0, damageMade: 0, firstKills: 0,
  };
}
function match(id: string, startedAt: string, puuidsRed: string[], puuidsBlue: string[]): CustomMatch {
  return {
    matchId: id, map: "Ascent", startedAt,
    teamRounds: { Red: 13, Blue: 9 },
    players: [...puuidsRed.map((p) => player(p, "Red")), ...puuidsBlue.map((p) => player(p, "Blue"))],
  };
}

const red = ["a", "b", "c", "d", "e"];
const blue = ["f", "g", "h", "i", "j"];
const expected = new Set([...red, ...blue]);

describe("countExpected", () => {
  it("compte les puuid attendus présents", () => {
    expect(countExpected(match("m", "t", red, blue), expected)).toBe(10);
    expect(countExpected(match("m", "t", red, ["f", "g", "h", "x", "y"]), expected)).toBe(8);
  });
});

describe("assignSides", () => {
  it("associe le côté Riot majoritaire A/B et les rounds", () => {
    const puuidToSide = new Map<string, "A" | "B">([
      ...red.map((p) => [p, "A"] as const),
      ...blue.map((p) => [p, "B"] as const),
    ]);
    const r = assignSides(match("m", "t", red, blue), puuidToSide);
    expect(r.sideOfTeam.Red).toBe("A");
    expect(r.sideOfTeam.Blue).toBe("B");
    expect(r.roundsA).toBe(13);
    expect(r.roundsB).toBe(9);
  });
});

describe("computeDerivedStats", () => {
  it("calcule ACS/ADR/HS%", () => {
    const p = { ...player("a", "Red"), score: 4400, damageMade: 3300, headshots: 30, bodyshots: 60, legshots: 10 };
    const s = computeDerivedStats(p, 22);
    expect(s.acs).toBe(200);
    expect(s.adr).toBe(150);
    expect(s.hsPct).toBe(30); // 30/100
  });
  it("gère la division par zéro", () => {
    const s = computeDerivedStats(player("a", "Red"), 0);
    expect(s).toEqual({ acs: 0, adr: 0, hsPct: 0 });
  });
});

describe("selectSeries", () => {
  it("filtre >=8, trie par date, plafonne à bestOf", () => {
    const m1 = match("m1", "2026-07-27T20:30:00Z", red, blue);
    const m2 = match("m2", "2026-07-27T20:00:00Z", red, blue);
    const m3 = match("m3", "2026-07-27T21:00:00Z", red, ["f", "x", "y", "z", "w"]); // 6 -> rejeté
    const out = selectSeries([m1, m2, m3], expected, 8, 3);
    expect(out.map((m) => m.matchId)).toEqual(["m2", "m1"]); // triés par date asc, m3 rejeté
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/match-stats-core.test.ts` — expect FAIL (module missing).

- [ ] **Step 3: Implement `src/lib/match-stats-core.ts`**

```ts
import type { CustomMatch, CustomMatchPlayer } from "@/lib/henrikdev";

export type Side = "A" | "B";

/** Nombre de joueurs de la partie dont le puuid est attendu. */
export function countExpected(match: CustomMatch, expected: Set<string>): number {
  return match.players.reduce((n, p) => (expected.has(p.puuid) ? n + 1 : n), 0);
}

/**
 * Détermine quel team_id Riot correspond au côté A/B (majorité des puuid connus),
 * et renvoie les rounds gagnés de chaque côté.
 */
export function assignSides(
  match: CustomMatch,
  puuidToSide: Map<string, Side>
): { sideOfTeam: Record<string, Side>; roundsA: number; roundsB: number } {
  const score: Record<string, { A: number; B: number }> = {};
  for (const p of match.players) {
    const side = puuidToSide.get(p.puuid);
    if (!side) continue;
    (score[p.teamId] ??= { A: 0, B: 0 })[side] += 1;
  }
  const sideOfTeam: Record<string, Side> = {};
  for (const teamId of Object.keys(match.teamRounds)) {
    const s = score[teamId] ?? { A: 0, B: 0 };
    sideOfTeam[teamId] = s.A >= s.B ? "A" : "B";
  }
  // Si les deux team_id se retrouvent du même côté (rare), forcer l'autre.
  const ids = Object.keys(match.teamRounds);
  if (ids.length === 2 && sideOfTeam[ids[0]] === sideOfTeam[ids[1]]) {
    sideOfTeam[ids[1]] = sideOfTeam[ids[0]] === "A" ? "B" : "A";
  }
  let roundsA = 0;
  let roundsB = 0;
  for (const [teamId, rounds] of Object.entries(match.teamRounds)) {
    if (sideOfTeam[teamId] === "A") roundsA += rounds;
    else roundsB += rounds;
  }
  return { sideOfTeam, roundsA, roundsB };
}

/** ACS = score/rounds, ADR = damage/rounds, HS% = hs/(hs+bs+ls). Arrondis, 0 si div/0. */
export function computeDerivedStats(
  p: CustomMatchPlayer,
  rounds: number
): { acs: number; adr: number; hsPct: number } {
  if (rounds <= 0) return { acs: 0, adr: 0, hsPct: 0 };
  const shots = p.headshots + p.bodyshots + p.legshots;
  return {
    acs: Math.round(p.score / rounds),
    adr: Math.round(p.damageMade / rounds),
    hsPct: shots > 0 ? Math.round((p.headshots / shots) * 100) : 0,
  };
}

/** Filtre les parties >= seuil de puuid attendus, trie par date croissante, plafonne. */
export function selectSeries(
  candidates: CustomMatch[],
  expected: Set<string>,
  threshold: number,
  cap: number
): CustomMatch[] {
  return candidates
    .filter((m) => countExpected(m, expected) >= threshold)
    .sort((a, b) => (a.startedAt ?? "").localeCompare(b.startedAt ?? ""))
    .slice(0, Math.max(1, cap));
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/unit/match-stats-core.test.ts` — expect PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/match-stats-core.ts tests/unit/match-stats-core.test.ts
git commit -m "feat: add pure match-stats core (matching, sides, derived stats)"
```

---

## Task 3: Schéma Prisma + migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260727010000_match_scoreboard/migration.sql`

- [ ] **Step 1: Étendre `MatchMap`** — après `order Int @default(0)` (avant la relation `match`), ajouter :
```prisma
  riotMatchId String?   @unique
  startedAt   DateTime?
  stats       PlayerGameStat[]
```

- [ ] **Step 2: Étendre `Match`** — après `vodUrl String?`, ajouter :
```prisma
  statsStatus    String?
  statsFetchedAt DateTime?
```

- [ ] **Step 3: Étendre `Player`** — dans `model Player`, après `memberships TeamMembership[]`, ajouter :
```prisma
  gameStats   PlayerGameStat[]
```

- [ ] **Step 4: Ajouter le model `PlayerGameStat`** (à la fin, après `MatchMap`) :
```prisma
model PlayerGameStat {
  id         String    @id @default(cuid())
  matchMapId String
  playerId   String?
  riotName   String
  riotTag    String?
  puuid      String?
  teamSide   String
  agent      String?
  kills      Int
  deaths     Int
  assists    Int
  acs        Int
  adr        Int
  hsPct      Int
  firstKills Int       @default(0)
  matchMap   MatchMap  @relation(fields: [matchMapId], references: [id], onDelete: Cascade)
  player     Player?   @relation(fields: [playerId], references: [id], onDelete: SetNull)

  @@index([matchMapId])
  @@index([playerId])
}
```

- [ ] **Step 5: Écrire la migration** `prisma/migrations/20260727010000_match_scoreboard/migration.sql` :
```sql
ALTER TABLE "MatchMap" ADD COLUMN IF NOT EXISTS "riotMatchId" TEXT;
ALTER TABLE "MatchMap" ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "MatchMap_riotMatchId_key" ON "MatchMap"("riotMatchId");

ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "statsStatus" TEXT;
ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "statsFetchedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "PlayerGameStat" (
  "id" TEXT NOT NULL,
  "matchMapId" TEXT NOT NULL,
  "playerId" TEXT,
  "riotName" TEXT NOT NULL,
  "riotTag" TEXT,
  "puuid" TEXT,
  "teamSide" TEXT NOT NULL,
  "agent" TEXT,
  "kills" INTEGER NOT NULL,
  "deaths" INTEGER NOT NULL,
  "assists" INTEGER NOT NULL,
  "acs" INTEGER NOT NULL,
  "adr" INTEGER NOT NULL,
  "hsPct" INTEGER NOT NULL,
  "firstKills" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "PlayerGameStat_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PlayerGameStat_matchMapId_idx" ON "PlayerGameStat"("matchMapId");
CREATE INDEX IF NOT EXISTS "PlayerGameStat_playerId_idx" ON "PlayerGameStat"("playerId");
ALTER TABLE "PlayerGameStat" ADD CONSTRAINT "PlayerGameStat_matchMapId_fkey"
  FOREIGN KEY ("matchMapId") REFERENCES "MatchMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerGameStat" ADD CONSTRAINT "PlayerGameStat_playerId_fkey"
  FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

- [ ] **Step 6: Appliquer + générer + typecheck**

Run: `npx prisma migrate deploy` then `npx prisma generate` (EPERM sur le DLL possible si le dev tourne — OK, types quand même écrits) then `npx tsc --noEmit` (exit 0).

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260727010000_match_scoreboard
git commit -m "feat: add PlayerGameStat model + MatchMap/Match stats fields"
```

---

## Task 4: Orchestrateur `fetchAndStoreMatchStats`

**Files:**
- Create: `src/lib/match-stats.ts`

- [ ] **Step 1: Implémenter l'orchestrateur**

```ts
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

  // Interroge l'historique custom de quelques joueurs jusqu'à trouver des candidats.
  const byId = new Map<string, CustomMatch>();
  for (const k of known.slice(0, MAX_PLAYER_QUERIES)) {
    let list: CustomMatch[] = [];
    try {
      list = await getPlayerCustomMatches(k.region, k.name, k.tag);
    } catch {
      continue; // rate-limit / erreur : passer au joueur suivant
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
    await tx.matchMap.deleteMany({ where: { matchId: match.id } }); // stats en cascade
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
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit` — expect exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/match-stats.ts
git commit -m "feat: add fetchAndStoreMatchStats orchestrator (idempotent)"
```

---

## Task 5: Déclencheur dans `updateMatchAction`

**Files:**
- Modify: `src/app/admin/actions/matches.ts`

- [ ] **Step 1: Lire** `src/app/admin/actions/matches.ts` pour trouver `updateMatchAction` et comment le statut est déterminé (champ `status` du form / de `data`).

- [ ] **Step 2: Déclencher après la mise à jour, si `FINISHED`**

Ajouter l'import :
```ts
import { fetchAndStoreMatchStats } from "@/lib/match-stats";
```
Dans `updateMatchAction`, APRÈS que le match a été mis à jour en base et AVANT les `revalidatePath`/`redirect`, ajouter (adapter le nom de la variable de statut à ce que le fichier utilise réellement — c'est la valeur validée du statut, p.ex. `data.status`) :
```ts
  if (data.status === "FINISHED") {
    try {
      await fetchAndStoreMatchStats(matchId);
    } catch (e) {
      // Ne jamais casser la validation du match sur une erreur de récupération.
      console.error("fetchAndStoreMatchStats failed", e);
    }
  }
```
Si `fetchAndStoreMatchStats` ne lève déjà jamais (elle renvoie un statut), le `try/catch` reste une ceinture de sécurité. NE PAS modifier la logique existante de mise à jour du match.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit` — expect exit 0.

- [ ] **Step 4: Commit**

```bash
git add "src/app/admin/actions/matches.ts"
git commit -m "feat: fetch scoreboard stats automatically on match validation"
```

---

## Task 6: Indicateur `statsStatus` en gestion du match

**Files:**
- Modify: `src/app/tournois/[id]/gestion/matchs/[matchId]/page.tsx`

- [ ] **Step 1: Lire** la page pour voir comment le match est chargé (variable `match`, quels champs sont `select`és — si un `select` limite les champs, ajouter `statsStatus` et `statsFetchedAt`).

- [ ] **Step 2: Afficher un indicateur** sous le titre du match :
```tsx
{match.statsStatus === "MATCHED" ? (
  <p className="mb-4 text-xs text-[var(--success)]">
    Stats récupérées automatiquement depuis Riot
    {match.statsFetchedAt ? ` (${new Date(match.statsFetchedAt).toLocaleString("fr-FR")})` : ""}.
  </p>
) : match.statsStatus === "NOT_FOUND" ? (
  <p className="mb-4 text-xs text-[var(--text-muted)]">
    Aucune partie custom correspondante trouvée. Ré-enregistre le match une fois la partie
    disponible dans l&apos;historique Riot pour réessayer.
  </p>
) : null}
```
Si le chargement du match utilise un `select` Prisma explicite qui n'inclut pas ces champs, ajouter `statsStatus: true, statsFetchedAt: true` à ce `select`. Si c'est un `include`/objet complet, rien à ajouter.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit` — expect exit 0.

- [ ] **Step 4: Commit**

```bash
git add "src/app/tournois/[id]/gestion/matchs/[matchId]/page.tsx"
git commit -m "feat: show stats fetch status on match management page"
```

---

## Task 7: Vérification finale

- [ ] **Step 1: Suite complète**

Run: `npx tsc --noEmit && npx vitest run` — exit 0, tous les tests verts (dont henrikdev-matches et match-stats-core).

- [ ] **Step 2: Vérification manuelle** (nécessite `HENRIKDEV_API_KEY` réel + `npm run dev` + de vrais joueurs avec Riot ID ayant joué une partie custom récente) :
  1. Renseigner les Riot IDs de ≥8 joueurs des 2 équipes.
  2. Jouer/avoir joué une partie custom récente entre eux.
  3. Passer le match à `FINISHED` (validation). Vérifier en base : `Match.statsStatus="MATCHED"`, `MatchMap` recréées avec `riotMatchId`, `PlayerGameStat` (10/carte), `scoreA/scoreB` = cartes gagnées.
  4. Cas non trouvé : valider un match sans partie custom correspondante → `statsStatus="NOT_FOUND"`, cartes admin inchangées.
  5. Confirmer que la validation ne plante jamais même si l'API échoue.

- [ ] **Step 3: Confirmer le mapping API** : si le scoreboard réel diffère (champs à 0 inattendus), ajuster UNIQUEMENT `mapRawCustomMatch` dans `src/lib/henrikdev.ts` contre une vraie réponse.

---

## Notes de dépendances

- Task 2 dépend de Task 1 (types). Task 4 dépend de 1, 2, 3. Task 5 de 4. Task 6 de 3.
- Toute l'incertitude API est confinée à `mapRawCustomMatch` (Task 1) ; le core et l'orchestrateur ne dépendent que du type normalisé `CustomMatch`.
- `fetchAndStoreMatchStats` ne lève jamais et est idempotente (delete+recreate) — sûre à relancer.
