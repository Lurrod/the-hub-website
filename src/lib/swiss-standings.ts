import type { MatchForfeit } from "@/lib/constants";

/** Score de rounds d'une map. Un Bo1 n'en a qu'une, un Bo3 jusqu'à trois. */
export type SwissMap = { scoreA: number; scoreB: number };

export type SwissMatch = {
  teamAId: string;
  teamBId: string;
  maps: readonly SwissMap[];
  forfeit: MatchForfeit;
};

export type SwissStandingRow = {
  teamId: string;
  played: number;
  /** Un point par victoire, comme le veut le règlement. */
  points: number;
  losses: number;
  /** Somme des points des adversaires rencontrés. */
  buchholz: number;
  roundsWon: number;
  roundsLost: number;
  roundDiff: number;
  /** L'équipe partage son rang : le règlement fait jouer un tie-break. */
  tied: boolean;
};

/**
 * Rounds attribués sur forfait. L'article 7 du règlement Spike Tour fixe la
 * victoire par forfait à 13-6. Sans cette convention, un forfait — qui se
 * saisit à 0-0 dans ce dépôt — n'apporterait aucun round à l'équipe présente et
 * la ferait reculer au départage pour une absence dont elle n'est pas
 * responsable.
 */
const FORFEIT_ROUNDS = [13, 6] as const;

/**
 * Rounds marqués de part et d'autre, ou `null` si le match n'apprend rien.
 *
 * Le score de série ne sert pas : en Bo1 il vaut 1-0 et perd le 13-6 dont les
 * départages de l'article 7 ont besoin. Un match sans map saisie et sans
 * forfait est écarté — c'est une rencontre programmée, pas un résultat.
 */
function roundsOf(match: SwissMatch): readonly [number, number] | null {
  if (match.forfeit === "TEAM_A") return [FORFEIT_ROUNDS[1], FORFEIT_ROUNDS[0]];
  if (match.forfeit === "TEAM_B") return [FORFEIT_ROUNDS[0], FORFEIT_ROUNDS[1]];
  let a = 0;
  let b = 0;
  for (const map of match.maps) {
    a += map.scoreA;
    b += map.scoreB;
  }
  return a === 0 && b === 0 ? null : [a, b];
}

type Tally = {
  teamId: string;
  played: number;
  points: number;
  losses: number;
  roundsWon: number;
  roundsLost: number;
  /** Adversaires rencontrés, doublons compris : le Buchholz les compte tous. */
  opponents: string[];
};

/**
 * Deux lignes que les départages de l'article 7 n'ont pas séparées.
 *
 * Le quatrième critère du règlement — la plus basse somme des scores concédés —
 * ne peut jamais trancher ce que les deux précédents ont laissé à égalité :
 * même différence et mêmes rounds marqués impliquent mêmes rounds concédés. Il
 * figure quand même dans le tri, pour coller au texte.
 */
function indiscernables(x: SwissStandingRow, y: SwissStandingRow): boolean {
  return (
    x.points === y.points &&
    x.buchholz === y.buchholz &&
    x.roundDiff === y.roundDiff &&
    x.roundsWon === y.roundsWon &&
    x.roundsLost === y.roundsLost
  );
}

/**
 * Classement de ronde suisse départagé selon l'article 7 du règlement Spike
 * Tour : Buchholz, puis différence de rounds, puis rounds marqués, puis rounds
 * concédés. Le tri final par identifiant n'est qu'un ordre d'affichage stable —
 * les équipes qu'il sépare portent `tied`, parce que le règlement les envoie
 * jouer un tie-break.
 *
 * Les matchs impliquant une équipe absente de `teamIds` sont ignorés, comme
 * dans `computeStandings`.
 */
export function buildSwissStandings(
  teamIds: readonly string[],
  matches: readonly SwissMatch[]
): SwissStandingRow[] {
  const table = new Map<string, Tally>();
  for (const id of teamIds) {
    table.set(id, {
      teamId: id,
      played: 0,
      points: 0,
      losses: 0,
      roundsWon: 0,
      roundsLost: 0,
      opponents: [],
    });
  }

  for (const match of matches) {
    const a = table.get(match.teamAId);
    const b = table.get(match.teamBId);
    if (!a || !b) continue;
    const rounds = roundsOf(match);
    if (!rounds) continue;
    const [ra, rb] = rounds;
    a.played++;
    b.played++;
    a.roundsWon += ra;
    a.roundsLost += rb;
    b.roundsWon += rb;
    b.roundsLost += ra;
    a.opponents.push(match.teamBId);
    b.opponents.push(match.teamAId);
    if (ra > rb) {
      a.points++;
      b.losses++;
    } else if (rb > ra) {
      b.points++;
      a.losses++;
    }
  }

  // Le Buchholz dépend du total de points des autres : il ne peut se calculer
  // qu'une fois toutes les rencontres dépouillées.
  const points = new Map([...table.values()].map((t) => [t.teamId, t.points]));

  const rows: SwissStandingRow[] = [...table.values()].map((t) => ({
    teamId: t.teamId,
    played: t.played,
    points: t.points,
    losses: t.losses,
    buchholz: t.opponents.reduce((sum, id) => sum + (points.get(id) ?? 0), 0),
    roundsWon: t.roundsWon,
    roundsLost: t.roundsLost,
    roundDiff: t.roundsWon - t.roundsLost,
    tied: false,
  }));

  rows.sort(
    (x, y) =>
      y.points - x.points ||
      y.buchholz - x.buchholz ||
      y.roundDiff - x.roundDiff ||
      y.roundsWon - x.roundsWon ||
      x.roundsLost - y.roundsLost ||
      x.teamId.localeCompare(y.teamId)
  );

  return rows.map((row, i) => {
    const avant = rows[i - 1];
    const apres = rows[i + 1];
    return {
      ...row,
      tied:
        (avant != null && indiscernables(avant, row)) ||
        (apres != null && indiscernables(row, apres)),
    };
  });
}

export type SwissStandingTeam = { teamId: string; name: string; tag: string };
export type SwissStandingDisplayRow = SwissStandingRow & {
  teamName: string;
  teamTag: string;
};

/**
 * Classement suisse prêt à afficher : `buildSwissStandings` suivi de la
 * résolution des noms d'équipe, comme `buildStandingRows` le fait pour le
 * classement ordinaire.
 */
export function buildSwissStandingRows(
  teams: readonly SwissStandingTeam[],
  matches: readonly SwissMatch[]
): SwissStandingDisplayRow[] {
  const byId = new Map(teams.map((t) => [t.teamId, t]));
  return buildSwissStandings(
    teams.map((t) => t.teamId),
    matches
  ).map((row) => {
    const team = byId.get(row.teamId);
    return {
      ...row,
      teamName: team?.name ?? row.teamId,
      teamTag: team?.tag ?? "?",
    };
  });
}
