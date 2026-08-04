import type {
  CustomMatch,
  CustomMatchKill,
  CustomMatchPlayer,
  CustomMatchRound,
  RoundOutcome,
} from "@/lib/henrikdev";

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

/**
 * Score de la série déduit des maps : une map gagnée vaut un point, une map
 * nulle n'en donne à personne. C'est la seule source de vérité du score dès
 * qu'un match a des maps, que celles-ci viennent de Riot ou de la saisie
 * manuelle — sinon retirer une map laisserait le score figé sur l'ancien.
 */
export function seriesScore(
  maps: readonly { scoreA: number; scoreB: number }[]
): { scoreA: number; scoreB: number } {
  let scoreA = 0;
  let scoreB = 0;
  for (const m of maps) {
    if (m.scoreA > m.scoreB) scoreA += 1;
    else if (m.scoreB > m.scoreA) scoreB += 1;
  }
  return { scoreA, scoreB };
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

/**
 * Fenêtre de trade du KAST : un joueur dont le tueur meurt dans les 3 s qui
 * suivent est considéré comme trade, donc son round « compte » quand même.
 * 3 s est la fenêtre retenue par les stats Valorant grand public.
 */
export const TRADE_WINDOW_MS = 3000;

export type PlayerImpact = { kastRounds: number; firstKills: number; firstDeaths: number };

/**
 * KAST, first kills et first deaths, déduits des duels round par round —
 * Riot n'expose aucun de ces trois chiffres tel quel.
 *
 * Un round compte dans le KAST d'un joueur s'il y a tué (K), assisté (A),
 * survécu (S) ou été trade (T). Le premier duel de chaque round donne son
 * first kill au tueur et son first death à la victime.
 */
export function computeImpact(
  kills: readonly CustomMatchKill[],
  puuids: readonly string[],
  roundCount: number
): Map<string, PlayerImpact> {
  const impact = new Map<string, PlayerImpact>(
    puuids.map((p) => [p, { kastRounds: 0, firstKills: 0, firstDeaths: 0 }])
  );
  if (roundCount <= 0) return impact;

  const byRound = new Map<number, CustomMatchKill[]>();
  for (const k of kills) {
    const list = byRound.get(k.round);
    if (list) list.push(k);
    else byRound.set(k.round, [k]);
  }

  for (const roundKills of byRound.values()) {
    const ordered = [...roundKills].sort((a, b) => a.timeInRoundMs - b.timeInRoundMs);

    const opener = ordered[0];
    if (opener) {
      const killer = impact.get(opener.killerPuuid);
      if (killer) killer.firstKills += 1;
      const victim = impact.get(opener.victimPuuid);
      if (victim) victim.firstDeaths += 1;
    }

    // Dernière mort de chaque joueur : c'est celle qui décide si on l'a vengé.
    const deathOf = new Map<string, CustomMatchKill>();
    for (const k of ordered) deathOf.set(k.victimPuuid, k);

    for (const [puuid, stats] of impact) {
      const death = deathOf.get(puuid);
      const survived = death === undefined;
      const killed = ordered.some((k) => k.killerPuuid === puuid);
      const assisted = ordered.some((k) => k.assistantPuuids.includes(puuid));
      const traded =
        death !== undefined &&
        ordered.some(
          (k) =>
            k.victimPuuid === death.killerPuuid &&
            k.timeInRoundMs > death.timeInRoundMs &&
            k.timeInRoundMs - death.timeInRoundMs <= TRADE_WINDOW_MS
        );
      if (killed || assisted || survived || traded) stats.kastRounds += 1;
    }
  }
  return impact;
}

/**
 * Rating 2.0 — portage de la formule HLTV 2.0 adaptée à Valorant utilisée sur
 * le site flhub (`services/rating.py`). Le coefficient ADR est rescalé de CS
 * (0.0032) à Valorant (0.00171) pour recentrer le joueur moyen autour de ~1.00.
 * Plancher à 0.01, jamais négatif ni nul.
 */
export function computeRating(s: {
  rounds: number;
  kills: number;
  deaths: number;
  assists: number;
  kastPct: number;
  adr: number;
}): number {
  if (s.rounds <= 0) return 0;
  const kpr = s.kills / s.rounds;
  const dpr = s.deaths / s.rounds;
  const apr = s.assists / s.rounds;
  const impact = 2.13 * kpr + 0.42 * apr - 0.41;
  const rating =
    0.0073 * s.kastPct +
    0.3591 * kpr -
    0.5329 * dpr +
    0.2372 * impact +
    0.00171 * s.adr -
    0.001;
  return Math.round(Math.max(0.01, rating) * 100) / 100;
}

/**
 * Frise des rounds du scoreboard : vainqueur ramené au côté A/B, et issue du
 * round. Les rounds dont le camp vainqueur est inconnu sont écartés plutôt que
 * rattachés au hasard à une équipe.
 */
export function roundTimeline(
  rounds: readonly CustomMatchRound[],
  sideOfTeam: Record<string, Side>
): { w: Side; o: RoundOutcome }[] {
  const timeline: { w: Side; o: RoundOutcome }[] = [];
  for (const r of rounds) {
    const w = sideOfTeam[r.winningTeamId];
    if (w) timeline.push({ w, o: r.outcome });
  }
  return timeline;
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
