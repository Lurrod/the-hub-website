export type FinishedMatch = {
  teamAId: string;
  teamBId: string;
  scoreA: number;
  scoreB: number;
};

export type StandingRow = {
  teamId: string;
  played: number;
  wins: number;
  losses: number;
  mapsWon: number;
  mapsLost: number;
  mapDiff: number;
};

/**
 * Classement de poule dérivé des matchs terminés.
 * Tri : victoires (desc) → différence de maps (desc) → maps gagnées (desc)
 *       → teamId (asc, départage déterministe final).
 * Les matchs impliquant une équipe absente de `teamIds` sont ignorés.
 */
export function computeStandings(teamIds: string[], matches: FinishedMatch[]): StandingRow[] {
  const table = new Map<string, StandingRow>();
  for (const id of teamIds) {
    table.set(id, {
      teamId: id,
      played: 0,
      wins: 0,
      losses: 0,
      mapsWon: 0,
      mapsLost: 0,
      mapDiff: 0,
    });
  }

  for (const m of matches) {
    const a = table.get(m.teamAId);
    const b = table.get(m.teamBId);
    if (!a || !b) continue;
    a.played++;
    b.played++;
    a.mapsWon += m.scoreA;
    a.mapsLost += m.scoreB;
    b.mapsWon += m.scoreB;
    b.mapsLost += m.scoreA;
    if (m.scoreA > m.scoreB) {
      a.wins++;
      b.losses++;
    } else if (m.scoreB > m.scoreA) {
      b.wins++;
      a.losses++;
    }
  }

  for (const row of table.values()) {
    row.mapDiff = row.mapsWon - row.mapsLost;
  }

  return [...table.values()].sort(
    (x, y) =>
      y.wins - x.wins ||
      y.mapDiff - x.mapDiff ||
      y.mapsWon - x.mapsWon ||
      x.teamId.localeCompare(y.teamId)
  );
}
