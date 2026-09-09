import type { MatchStage, MatchStatus, TournamentFormat, TournamentStatus } from "@prisma/client";

/**
 * Types et aides communs aux tournois de démonstration des formats.
 *
 * Extraits de `seed-formats.ts` le jour où le fichier a dépassé les 800 lignes
 * du plafond maison : les définitions de tournois y grossissent à chaque format
 * ajouté, la mécanique non.
 */

/** Équipes par seed : l'index sert de référence dans les tableaux de matchs. */
export const TEAM_IDS = [
  "vlr-th", // 1
  "vlr-vit", // 2
  "vlr-fnc", // 3
  "vlr-tl", // 4
  "vlr-fut", // 5
  "vlr-bbl", // 6
  "vlr-gm", // 7
  "vlr-ef", // 8
];

export type MatchSeed = {
  key: string;
  a: number;
  b: number;
  sa?: number;
  sb?: number;
  stage?: MatchStage;
  group?: string;
  round?: string;
  pos?: number;
  status?: MatchStatus;
  bestOf?: number;
  day: number;
  /** Détail des maps : [nom, score A, score B]. */
  maps?: [string, number, number][];
  vod?: string;
};

export type GroupSeed = { key: string; name: string; teams: number[] };

export type TournamentSeed = {
  id: string;
  name: string;
  format: TournamentFormat;
  status: TournamentStatus;
  description: string;
  prizePool: string;
  bestOf: number;
  groupSize?: number;
  teams: number[];
  groups?: GroupSeed[];
  matches: MatchSeed[];
  startDay: number;
  endDay: number;
};

export const DAY = 24 * 60 * 60 * 1000;
export const ORIGIN = new Date("2026-09-07T18:00:00Z").getTime();
export const at = (day: number) => new Date(ORIGIN + day * DAY);

/** Toutes les paires d'un groupe d'index, dans un ordre stable. */
export function roundRobin(teams: number[]): [number, number][] {
  const pairs: [number, number][] = [];
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) pairs.push([teams[i], teams[j]]);
  }
  return pairs;
}

/** Score déterministe : pas de hasard, le seed doit être reproductible. */
export function score(i: number): [number, number] {
  const table: [number, number][] = [
    [2, 0],
    [2, 1],
    [1, 2],
    [0, 2],
  ];
  return table[i % table.length];
}

/** Matchs de poule d'un groupe : round robin complet, tous joués. */
export function groupMatches(group: GroupSeed, startDay: number, played = true): MatchSeed[] {
  return roundRobin(group.teams).map(([a, b], i) => {
    const [sa, sb] = score(i);
    return {
      key: `${group.key}-${i + 1}`,
      a,
      b,
      sa: played ? sa : 0,
      sb: played ? sb : 0,
      stage: "GROUP" as MatchStage,
      group: group.key,
      status: (played ? "FINISHED" : "SCHEDULED") as MatchStatus,
      day: startDay + i,
    };
  });
}

export const POOL_A: GroupSeed = { key: "a", name: "Groupe A", teams: [0, 1, 2, 3] };
export const POOL_B: GroupSeed = { key: "b", name: "Groupe B", teams: [4, 5, 6, 7] };
