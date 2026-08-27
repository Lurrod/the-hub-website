import { timingSafeEqual } from "node:crypto";
import { roundLabelForSize } from "@/lib/bracket";

/**
 * Logique pure du miroir Premier : aucun accès base, aucun appel réseau, aucune
 * lecture d'horloge.
 *
 * Tout ce qui se teste sans base vit ici — c'est la condition pour que la
 * synchronisation soit couverte, `src/lib/data/**` étant hors du périmètre de
 * `vitest.config.ts`. Les fonctions qui ont besoin du temps qui passe
 * (`nextDelayMs`) reçoivent l'écoulé en paramètre plutôt que d'appeler
 * `Date.now()` : c'est ce qui les rend vérifiables.
 */

export type PremierTier = "CONTENDER" | "INVITE";

export type PremierTierTarget = {
  conference: string;
  division: number;
  tier: PremierTier;
};

/**
 * Les deux seuls paliers français suivis par le site.
 *
 * Relevé sur l'API le 2026-08-27 : `EU_FRANCE` division 21 compte 59 équipes,
 * `EU_FRANCE_SUPER` division 22 en compte 13. Les divisions 6 à 20 sont les
 * paliers inférieurs — environ 525 équipes, hors du positionnement Tier 3 du
 * site.
 */
const TIERS: readonly PremierTierTarget[] = [
  { conference: "EU_FRANCE", division: 21, tier: "CONTENDER" },
  { conference: "EU_FRANCE_SUPER", division: 22, tier: "INVITE" },
];

/** Palier français d'une équipe, ou `null` si elle est hors périmètre. */
export function frenchTierOf(conference: string, division: number): PremierTier | null {
  const hit = TIERS.find((t) => t.conference === conference && t.division === division);
  return hit?.tier ?? null;
}

/** Les couples conférence/division à interroger, dans l'ordre d'appel. */
export function frenchTiers(): readonly PremierTierTarget[] {
  return TIERS;
}

export type PremierSeason = { id: string; startsAt: string; endsAt: string };

/**
 * Saison à laquelle rattacher un match, déduite de sa date de début.
 *
 * Les entrées d'historique de l'API ne portent **aucun champ de saison** :
 * seulement un `started_at`. Le rattachement passe donc par la fenêtre
 * `starts_at`/`ends_at` de chaque saison. Une date hors de toute fenêtre rend
 * `null` — mieux vaut un match ignoré qu'un match rangé dans la mauvaise
 * saison, où il fausserait un classement.
 *
 * La borne de fin est **exclue** : les saisons sont contiguës à la seconde
 * près — la 18 se termine le 2026-08-19T03:15:00Z, la 19 commence au même
 * instant. Avec deux bornes incluses, un match tombant pile au basculement
 * appartiendrait aux deux et serait rangé dans la plus ancienne.
 */
export function seasonOfMatch(seasons: readonly PremierSeason[], startedAt: string): string | null {
  const t = Date.parse(startedAt);
  if (Number.isNaN(t)) return null;
  const hit = seasons.find((s) => {
    const from = Date.parse(s.startsAt);
    const to = Date.parse(s.endsAt);
    return !Number.isNaN(from) && !Number.isNaN(to) && t >= from && t < to;
  });
  return hit?.id ?? null;
}

/**
 * Numéro affiché d'une saison, déduit de son rang.
 *
 * L'API ne donne aux saisons ni nom ni numéro, seulement un UUID et des dates :
 * le rang est le seul repère disponible. Ce n'est qu'un libellé — l'identité
 * d'un tournoi reste son `premierSeasonId`. Si Riot réécrit son historique, les
 * numéros affichés glissent, pas les rattachements.
 */
export function seasonNumberOf(seasonIds: readonly string[], seasonId: string): number | null {
  const i = seasonIds.indexOf(seasonId);
  return i < 0 ? null : i + 1;
}

/**
 * Matchs joués **entre deux équipes suivies**, dans leur ordre d'apparition.
 *
 * Chaque match figure dans l'historique des deux équipes qui l'ont joué : ne
 * garder que ceux vus au moins deux fois revient à écarter, sans le moindre
 * appel réseau, les matchs dont l'adversaire est hors périmètre — autre
 * conférence, division inférieure, ou équipe descendue depuis.
 *
 * Une simple déduplication les laissait passer : on les récupérait pour
 * découvrir que l'adversaire manquait, on les rejetait, et on recommençait au
 * passage suivant. Mesuré sur le miroir de deux saisons : 227 appels par
 * passage — à deux crédits pièce — pour zéro match importé, soit un quart
 * d'heure de quota brûlé toutes les quinze minutes.
 *
 * Le compte se fait par historique et non par occurrence : un même match
 * répété dans la liste d'une seule équipe ne prouve pas qu'on suit son
 * adversaire.
 */
export function mutualMatchIds(histories: readonly (readonly string[])[]): string[] {
  const seenIn = new Map<string, number>();
  const order: string[] = [];
  for (const history of histories) {
    for (const id of new Set(history)) {
      const n = seenIn.get(id) ?? 0;
      if (n === 0) order.push(id);
      seenIn.set(id, n + 1);
    }
  }
  return order.filter((id) => (seenIn.get(id) ?? 0) >= 2);
}

export type PremierMatchTeam = {
  teamId: string;
  won: boolean;
  rosterId: string | null;
  roundsWon: number;
  roundsLost: number;
};

export type ResolvedSides = {
  outcomeOfTeamA: "WON" | "LOST";
  roundsA: number;
  roundsB: number;
};

/**
 * Quel camp du match Riot correspond à l'équipe A du match du site.
 *
 * Le lien passe par `teams[].premier_roster.id`, seul champ qui rattache un
 * camp — « Red » et « Blue » sont attribués arbitrairement d'un match à
 * l'autre — à une équipe Premier identifiée. Sans lui, on ne saurait pas qui a
 * gagné pour qui.
 */
export function sideOfRoster(
  teams: readonly PremierMatchTeam[],
  rosterIdOfTeamA: string
): ResolvedSides | null {
  const a = teams.find((t) => t.rosterId !== null && t.rosterId === rosterIdOfTeamA);
  if (!a) return null;
  return {
    outcomeOfTeamA: a.won ? "WON" : "LOST",
    roundsA: a.roundsWon,
    roundsB: a.roundsLost,
  };
}

export type PremierTournamentStatus = "UPCOMING" | "ONGOING" | "FINISHED";

/**
 * Statut d'un tournoi Premier déduit de la fenêtre de sa saison.
 *
 * Le figer à « en cours » à la création laissait les saisons passées
 * éternellement ouvertes. Les dates étant posées sur le tournoi, le recalage
 * nocturne (`scripts/sync-tournament-statuses.mjs`) prend ensuite le relais —
 * ce calcul ne sert qu'à ne pas afficher une bêtise entre-temps.
 *
 * Des dates illisibles rendent « en cours » : déclarer terminé sur une donnée
 * qu'on n'a pas su lire masquerait le tournoi.
 */
export function tournamentStatusFor(season: PremierSeason, nowMs: number): PremierTournamentStatus {
  const from = Date.parse(season.startsAt);
  const to = Date.parse(season.endsAt);
  if (Number.isNaN(from) || Number.isNaN(to)) return "ONGOING";
  if (nowMs >= to) return "FINISHED";
  if (nowMs < from) return "UPCOMING";
  return "ONGOING";
}

export type PremierParticipation = { tournamentId: string; matches: readonly string[] };

/** Une partie de playoffs, une fois connus son heure et ses deux camps. */
export type PlayoffGame = {
  matchId: string;
  startedAtMs: number;
  rosterIds: readonly string[];
};

/** Une rencontre : une seule carte en Bo1, deux ou trois en finale. */
export type PlayoffSeries = {
  bracketId: string;
  roundLabel: string;
  bestOf: number;
  matchIds: string[];
};

/** Nom d'un arbre parallèle, par son rang. Borné à l'alphabet. */
export function bracketNameFor(index: number): string {
  const i = Math.min(25, Math.max(0, index));
  return `Bracket ${String.fromCharCode(65 + i)}`;
}

/** Clé d'une paire d'adversaires, indépendante de l'ordre des camps. */
function paire(rosterIds: readonly string[]): string {
  return [...rosterIds].sort().join("|");
}

/**
 * Reconstruit les rencontres d'un arbre de playoffs à partir de ses parties.
 *
 * Trois pièges, tous payés avant d'écrire cette fonction :
 *
 * - **`matches[]` n'est pas chronologique.** Sur un parcours réel, le rang 0
 *   tombait à 19 h 48 et le rang 2 à 17 h 20. Déduire le tour du rang, comme
 *   une première version le faisait, range les matchs n'importe où. Seule
 *   l'heure fait foi.
 * - **La finale se joue en Bo3**, donc en deux ou trois parties. Les compter
 *   comme autant de tours donnait des arbres de profondeur 5 là où Riot en
 *   joue 3. Des parties consécutives contre le même adversaire forment une
 *   seule rencontre.
 * - **Le Bo se mesure, il ne se suppose pas** : c'est le nombre de cartes de la
 *   rencontre, ce qui redonne Bo1 partout et Bo3 en finale sans le coder en dur.
 *
 * La profondeur de l'arbre est le plus long parcours en rencontres — trois pour
 * le vainqueur d'un arbre de huit. Elle n'est fiable que parce qu'on suit toute
 * la division et qu'on observe donc l'arbre entier.
 */
export function playoffSeries(bracketId: string, games: readonly PlayoffGame[]): PlayoffSeries[] {
  if (games.length === 0) return [];
  const ordre = [...games].sort((a, b) => a.startedAtMs - b.startedAtMs);

  // Regroupement par adversaire, en ne fusionnant que des parties qui se
  // suivent : deux rencontres séparées contre la même équipe restent deux
  // rencontres.
  const rencontres: { cle: string; rosterIds: readonly string[]; matchIds: string[] }[] = [];
  for (const g of ordre) {
    const cle = paire(g.rosterIds);
    const derniere = rencontres[rencontres.length - 1];
    const memeAdversaireJusteAvant = rencontres.findLast((r) => r.cle === cle);
    if (derniere && memeAdversaireJusteAvant === derniere) {
      derniere.matchIds.push(g.matchId);
    } else {
      rencontres.push({ cle, rosterIds: g.rosterIds, matchIds: [g.matchId] });
    }
  }

  // Rang d'une rencontre = son numéro dans le parcours de ses équipes.
  const parcours = new Map<string, number>();
  const rangs = rencontres.map((r) => {
    const rang = Math.max(...r.rosterIds.map((id) => parcours.get(id) ?? 0));
    r.rosterIds.forEach((id) => parcours.set(id, rang + 1));
    return rang;
  });

  const profondeur = Math.max(...rangs) + 1;
  return rencontres.map((r, i) => ({
    bracketId,
    roundLabel: roundLabelForSize(Math.max(1, 2 ** (profondeur - 1 - rangs[i]))),
    bestOf: r.matchIds.length,
    matchIds: r.matchIds,
  }));
}

/**
 * Marge conservée sous le quota.
 *
 * On s'arrête avant zéro plutôt qu'à zéro : le compteur est partagé par tout
 * ce qui utilise la clé — une vérification de Riot ID déclenchée par un
 * visiteur pendant la synchronisation consomme le même seau.
 */
export const QUOTA_FLOOR = 3;

/**
 * Attente à respecter avant le prochain appel HenrikDev.
 *
 * Le quota ne se devine pas, il se lit : chaque réponse porte
 * `x-ratelimit-remaining` et `x-ratelimit-reset`, ce dernier étant un compte à
 * rebours en secondes. Une première version estimait le coût d'un appel à deux
 * crédits et comptait elle-même une fenêtre de 60 s : la mesure a montré un
 * crédit par appel et une remise à zéro glissante, et la synchronisation
 * prenait quand même un 429 au bout de deux minutes.
 *
 * `remaining` à `null` signifie qu'aucun en-tête n'a encore été observé : on
 * n'attend pas, sous peine de perdre une minute avant le tout premier appel.
 */
export function quotaDelayMs(q: {
  remaining: number | null;
  resetAtMs: number | null;
  nowMs: number;
}): number {
  if (q.remaining === null || q.resetAtMs === null) return 0;
  if (q.remaining > QUOTA_FLOOR) return 0;
  return Math.max(0, q.resetAtMs - q.nowMs);
}

const BEARER = "Bearer ";

/**
 * L'en-tête d'autorisation porte-t-il le bon secret ?
 *
 * Comparaison à temps constant : une comparaison naïve laisse deviner le secret
 * octet par octet en mesurant le temps de réponse. Un secret attendu vide
 * refuse tout — sans quoi une variable d'environnement oubliée en production
 * ouvrirait la route au premier venu.
 */
export function secretMatches(header: string | null, expected: string): boolean {
  if (!expected) return false;
  if (!header?.startsWith(BEARER)) return false;
  const given = Buffer.from(header.slice(BEARER.length));
  const want = Buffer.from(expected);
  // `timingSafeEqual` lève sur des longueurs différentes : le test de longueur
  // fuite déjà par le temps de réponse, mais la longueur d'un secret n'est pas
  // ce qu'on protège.
  if (given.length !== want.length) return false;
  return timingSafeEqual(given, want);
}
