import type { CustomMatch, CustomMatchPlayer } from "@/lib/henrikdev";

export type Side = "A" | "B";

/** Camps bruts renvoyés par Riot, et le repli « laisser déduire par les puuid ». */
export const RIOT_CAMPS = ["Blue", "Red"] as const;
export type RiotCamp = (typeof RIOT_CAMPS)[number];

/**
 * Vrai quand un scoreboard Riot est rattaché au match, qu'il vienne de la
 * recherche automatique ou d'un import manuel par identifiant de partie.
 */
export function hasRiotStats(status: string | null): boolean {
  return status === "MATCHED" || status === "MANUAL";
}

/**
 * Index `puuid -> playerId` des fiches du site. Sert à rattacher un scoreboard
 * à ses joueurs sans passer par les rosters : un remplaçant, ou un joueur d'un
 * tournoi rejoué hors du site, n'est pas dans l'effectif des deux équipes.
 */
export function indexPlayerIdsByPuuid(
  rows: readonly { id: string; puuid: string | null }[]
): Map<string, string> {
  const index = new Map<string, string>();
  for (const r of rows) if (r.puuid) index.set(r.puuid, r.id);
  return index;
}

/** Rounds gagnés de chaque côté, une fois les camps Riot rattachés à A et B. */
function roundsBySide(
  match: CustomMatch,
  sideOfTeam: Record<string, Side>
): { roundsA: number; roundsB: number } {
  let roundsA = 0;
  let roundsB = 0;
  for (const [teamId, rounds] of Object.entries(match.teamRounds)) {
    if (sideOfTeam[teamId] === "A") roundsA += rounds;
    else roundsB += rounds;
  }
  return { roundsA, roundsB };
}

/**
 * Rattachement des camps imposé par l'admin, pour l'import manuel d'une partie.
 * La déduction par les puuid ne sert à rien dans ce cas : c'est justement quand
 * les joueurs ne sont pas liés à un compte Riot qu'on en arrive là.
 */
export function assignSidesFromCamp(
  match: CustomMatch,
  campOfTeamA: string
): { sideOfTeam: Record<string, Side>; roundsA: number; roundsB: number } {
  const camp = campOfTeamA.toLowerCase();
  const sideOfTeam: Record<string, Side> = {};
  for (const teamId of Object.keys(match.teamRounds)) {
    sideOfTeam[teamId] = teamId.toLowerCase() === camp ? "A" : "B";
  }
  return { sideOfTeam, ...roundsBySide(match, sideOfTeam) };
}

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
  const ids = Object.keys(match.teamRounds);
  if (ids.length === 2 && sideOfTeam[ids[0]] === sideOfTeam[ids[1]]) {
    sideOfTeam[ids[1]] = sideOfTeam[ids[0]] === "A" ? "B" : "A";
  }
  return { sideOfTeam, ...roundsBySide(match, sideOfTeam) };
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
