import type {
  CustomMatch,
  CustomMatchKill,
  CustomMatchPlayer,
  CustomMatchRound,
  RoundOutcome,
} from "@/lib/henrikdev";

export type Side = "A" | "B";

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

/**
 * Rattachement des camps par le résultat annoncé (« l'équipe A a gagné »).
 *
 * L'organisateur sait toujours qui a gagné la map, rarement quel camp Riot
 * (Blue/Red) était le sien — c'est ce qui rendait le sélecteur de camp
 * inutilisable en pratique. Les données Riot donnent le camp vainqueur (le
 * plus de rounds) : on traduit le résultat en camp puis on délègue.
 *
 * Renvoie null quand la map n'a pas de vainqueur (égalité de rounds) :
 * « a gagné » n'y départage rien, l'appelant doit refuser l'import plutôt
 * que risquer d'inverser les équipes en silence.
 */
export function assignSidesFromOutcome(
  match: CustomMatch,
  teamAWon: boolean
): { sideOfTeam: Record<string, Side>; roundsA: number; roundsB: number } | null {
  const camps = Object.entries(match.teamRounds);
  if (camps.length !== 2 || camps[0][1] === camps[1][1]) return null;
  const winner = camps[0][1] > camps[1][1] ? camps[0][0] : camps[1][0];
  const loser = camps[0][0] === winner ? camps[1][0] : camps[0][0];
  return assignSidesFromCamp(match, teamAWon ? winner : loser);
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
export function seriesScore(maps: readonly { scoreA: number; scoreB: number }[]): {
  scoreA: number;
  scoreB: number;
} {
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

/** Faits d'armes d'un joueur sur une carte : multikills et clutchs. */
export type PlayerHighlights = {
  /** Rounds à exactement 3 kills. */
  triples: number;
  /** Rounds à exactement 4 kills. */
  quadras: number;
  /** Rounds à 5 kills ou plus. */
  aces: number;
  clutchWins: number;
  clutchAttempts: number;
  /** Plus grand 1vX remporté (0 si aucun). */
  bestClutch: number;
};

/**
 * Multikills et clutchs, reconstruits depuis la liste des duels — Riot
 * n'expose ni l'un ni l'autre tel quel.
 *
 * Un clutch commence quand un joueur devient le dernier vivant de son camp
 * face à au moins un adversaire ; il est gagné si son camp remporte le round,
 * même posthume — un spike qui explose après sa mort reste son clutch. Limite
 * assumée : une résurrection de Sage ne laisse aucune trace dans les duels, le
 * ressuscité reste donc compté mort, comme sur les trackers grand public.
 */
export function computeHighlights(
  kills: readonly CustomMatchKill[],
  players: readonly { puuid: string; teamId: string }[],
  rounds: readonly { winningTeamId: string }[]
): Map<string, PlayerHighlights> {
  const highlights = new Map<string, PlayerHighlights>(
    players.map((p) => [
      p.puuid,
      { triples: 0, quadras: 0, aces: 0, clutchWins: 0, clutchAttempts: 0, bestClutch: 0 },
    ])
  );
  const teamOf = new Map(players.map((p) => [p.puuid, p.teamId]));

  const byRound = new Map<number, CustomMatchKill[]>();
  for (const k of kills) {
    const list = byRound.get(k.round);
    if (list) list.push(k);
    else byRound.set(k.round, [k]);
  }

  for (const [round, roundKills] of byRound) {
    const ordered = [...roundKills].sort((a, b) => a.timeInRoundMs - b.timeInRoundMs);

    // Multikills : le nombre de frags du round, joueur par joueur.
    const fragsOf = new Map<string, number>();
    for (const k of ordered) fragsOf.set(k.killerPuuid, (fragsOf.get(k.killerPuuid) ?? 0) + 1);
    for (const [puuid, frags] of fragsOf) {
      const h = highlights.get(puuid);
      if (!h) continue;
      if (frags === 3) h.triples += 1;
      else if (frags === 4) h.quadras += 1;
      else if (frags >= 5) h.aces += 1;
    }

    // Clutchs : on rejoue les morts dans l'ordre en suivant les survivants.
    const alive = new Map<string, Set<string>>();
    for (const p of players) {
      const team = alive.get(p.teamId) ?? new Set<string>();
      team.add(p.puuid);
      alive.set(p.teamId, team);
    }
    const attempts: { puuid: string; teamId: string; size: number }[] = [];
    for (const k of ordered) {
      const victimTeam = teamOf.get(k.victimPuuid);
      if (!victimTeam) continue;
      const team = alive.get(victimTeam);
      if (!team) continue;
      team.delete(k.victimPuuid);
      if (team.size !== 1) continue;
      // Le camp vient de tomber à un seul vivant : ses adversaires encore
      // debout donnent la taille du clutch. Zéro adversaire = round déjà plié.
      const [last] = team;
      const enemies = [...alive.entries()]
        .filter(([teamId]) => teamId !== victimTeam)
        .reduce((n, [, set]) => n + set.size, 0);
      if (enemies > 0) attempts.push({ puuid: last, teamId: victimTeam, size: enemies });
    }

    const winner = rounds[round]?.winningTeamId;
    for (const a of attempts) {
      const h = highlights.get(a.puuid);
      if (!h) continue;
      h.clutchAttempts += 1;
      if (winner && a.teamId === winner) {
        h.clutchWins += 1;
        h.bestClutch = Math.max(h.bestClutch, a.size);
      }
    }
  }
  return highlights;
}

/**
 * Constante de recentrage du rating.
 *
 * HLTV 2.0 porte un terme constant de `+0.1587`, calibré sur Counter-Strike.
 * Le portage Valorant en avait hérité une valeur de `-0.001`, ce qui tassait
 * toute l'échelle : le joueur moyen sortait à 0,90, et un joueur à 46/40/22 —
 * K/D positif, beaucoup d'assists — restait sous 1,00, ce qu'une échelle
 * centrée sur 1 ne devrait jamais produire.
 *
 * La valeur ci-dessous est ajustée pour que la ligne de statistiques moyenne
 * du site tombe exactement sur 1,00. Elle a été mesurée le 2026-08-11 sur les
 * scoreboards en base.
 *
 * Elle se remesure avec `node scripts/recalibrate-ratings.mjs`, qui affiche la
 * valeur qu'appellent les données du moment. Si l'écart devient sensible — le
 * niveau moyen d'une base qui grossit peut dériver — il suffit de reporter la
 * valeur ici, puis de relancer le script avec `--apply` pour recalculer les
 * ratings déjà stockés.
 */
export const RATING_BASELINE = 0.099;

/**
 * Rating 2.0 — portage de la formule HLTV 2.0 adaptée à Valorant utilisée sur
 * le site flhub (`services/rating.py`). Le coefficient ADR est rescalé de CS
 * (0.0032) à Valorant (0.00171), l'ADR y étant environ deux fois plus élevé :
 * le terme pèse ainsi autant dans les deux jeux. Le recentrage sur 1,00 est
 * porté par `RATING_BASELINE`. Plancher à 0.01, jamais négatif ni nul.
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
    0.00171 * s.adr +
    RATING_BASELINE;
  return Math.round(Math.max(0.01, rating) * 100) / 100;
}

/**
 * Frise des rounds du scoreboard : vainqueur ramené au côté A/B, et issue du
 * round. Les rounds dont le camp vainqueur est inconnu sont écartés plutôt que
 * rattachés au hasard à une équipe.
 */
/**
 * Une entrée de la frise des rounds, telle qu'elle est stockée en base.
 * `s`, `ea` et `eb` sont optionnels : les maps importées avant leur ajout ne
 * les portent pas, et l'affichage doit s'en passer sans casser.
 */
export type TimelineEntry = {
  /** Côté vainqueur du round. */
  w: Side;
  o: RoundOutcome;
  /** Côté qui attaquait ce round. */
  s?: Side;
  /** Valeur d'équipement du côté A, puis du côté B. */
  ea?: number;
  eb?: number;
};

/**
 * Camp attaquant de chaque round, déduit des poses de spike.
 *
 * Riot ne dit nulle part « cette équipe attaque » : seule la pose du spike le
 * trahit, et un round peut se terminer sans pose. On identifie donc l'attaquant
 * de chaque mi-temps à partir des rounds où quelqu'un a posé, puis on l'étend
 * aux rounds muets de la même mi-temps.
 *
 * Une « mi-temps » vaut 12 rounds en temps réglementaire, mais **un seul round
 * en prolongation** : chaque prolongation Valorant compte deux rounds, un par
 * camp, les côtés s'échangent donc à chaque round passé le 24e.
 */
export function attackingTeamByRound(rounds: readonly CustomMatchRound[]): (string | null)[] {
  const REGULATION_HALF = 12;
  const REGULATION_ROUNDS = REGULATION_HALF * 2;
  /** Numéro de mi-temps d'un round : 0 et 1 en temps réglementaire, puis 1 par round d'OT. */
  const halfOf = (i: number) =>
    i < REGULATION_ROUNDS ? Math.floor(i / REGULATION_HALF) : 2 + (i - REGULATION_ROUNDS);

  // Attaquant constaté pour chaque mi-temps où au moins un spike a été posé.
  const attackerOfHalf = new Map<number, string>();
  rounds.forEach((r, i) => {
    if (r.plantedByTeamId && !attackerOfHalf.has(halfOf(i))) {
      attackerOfHalf.set(halfOf(i), r.plantedByTeamId);
    }
  });

  const teamIds = [...new Set(rounds.map((r) => r.winningTeamId).filter(Boolean))];
  const other = (id: string) => teamIds.find((t) => t !== id) ?? null;

  return rounds.map((r, i) => {
    const half = halfOf(i);
    const known = attackerOfHalf.get(half);
    if (known) return known;
    // Mi-temps sans aucune pose : on la deduit de la mi-temps precedente,
    // puisque les camps s'inversent a chaque changement.
    for (let h = half - 1; h >= 0; h--) {
      const prev = attackerOfHalf.get(h);
      if (prev) return (half - h) % 2 === 0 ? prev : other(prev);
    }
    return null;
  });
}

/**
 * Frise des rounds du scoreboard : vainqueur ramené au côté A/B, issue du
 * round, camp attaquant et valeur d'équipement de chaque côté. Les rounds dont
 * le camp vainqueur est inconnu sont écartés plutôt que rattachés au hasard.
 */
export function roundTimeline(
  rounds: readonly CustomMatchRound[],
  sideOfTeam: Record<string, Side>
): TimelineEntry[] {
  const attackers = attackingTeamByRound(rounds);
  const timeline: TimelineEntry[] = [];
  rounds.forEach((r, i) => {
    const w = sideOfTeam[r.winningTeamId];
    if (!w) return;
    const attacker = attackers[i];
    const entry: TimelineEntry = { w, o: r.outcome };
    if (attacker && sideOfTeam[attacker]) entry.s = sideOfTeam[attacker];
    for (const [teamId, value] of Object.entries(r.loadoutByTeam)) {
      if (sideOfTeam[teamId] === "A") entry.ea = value;
      else if (sideOfTeam[teamId] === "B") entry.eb = value;
    }
    timeline.push(entry);
  });
  return timeline;
}

/**
 * Tolérance autour de la date programmée d'un match.
 *
 * La date vient d'un `<input type="date">`, donc de minuit UTC, alors que les
 * matchs se jouent le soir : la fenêtre doit couvrir la soirée du jour dit et
 * déborder sur la nuit suivante, sans mordre sur la veille ni le surlendemain.
 */
export const SERIES_WINDOW_MS = 36 * 60 * 60 * 1000;

/** La partie s'est-elle jouée dans la fenêtre autour de la date du match ? */
function withinWindow(match: CustomMatch, around: Date): boolean {
  if (!match.startedAt) return false;
  const started = new Date(match.startedAt).getTime();
  if (Number.isNaN(started)) return false;
  const delta = started - around.getTime();
  // Asymétrique : la date de référence est minuit, le match est plus tard.
  return delta >= -SERIES_WINDOW_MS / 3 && delta <= SERIES_WINDOW_MS;
}

/**
 * Parties correspondant à la série, triées chronologiquement et plafonnées.
 *
 * `around` restreint aux parties jouées autour de la date programmée du match.
 * Sans cette borne, deux équipes ayant scrimmé le même jour voyaient leurs
 * scrims importés à la place du match officiel — le filtre par puuid ne les
 * distingue pas. Une date de match absente désactive la borne : mieux vaut un
 * import approximatif que pas d'import du tout.
 *
 * Au-delà du plafond, ce sont les parties les PLUS RÉCENTES qui sont retenues :
 * échauffements et scrims précèdent le match officiel bien plus souvent
 * qu'ils ne le suivent.
 */
export function selectSeries(
  candidates: CustomMatch[],
  expected: Set<string>,
  threshold: number,
  cap: number,
  around?: Date | null
): CustomMatch[] {
  const matching = candidates
    .filter((m) => countExpected(m, expected) >= threshold)
    .filter((m) => !around || withinWindow(m, around))
    .sort((a, b) => (a.startedAt ?? "").localeCompare(b.startedAt ?? ""));

  return matching.slice(-Math.max(1, cap));
}
