import { timingSafeEqual } from "node:crypto";

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
 * Identifiants de match uniques, dans leur ordre de première apparition.
 *
 * Chaque match figure dans l'historique des deux équipes qui l'ont joué : sans
 * ce filtre, on paierait deux appels d'API pour chaque match importé, sur un
 * quota déjà étroit.
 */
export function dedupeMatchIds(histories: readonly (readonly string[])[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const history of histories) {
    for (const id of history) {
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
  }
  return out;
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

export type PremierBracket = { name: string; teamIds: string[] };

/** Taille d'un arbre Premier, imposée par Riot. */
const BRACKET_SIZE = 8;

/**
 * Répartit les équipes qualifiées en arbres parallèles de 8.
 *
 * Le dernier arbre reste incomplet s'il le faut : le compléter avec des équipes
 * fantômes fabriquerait des matchs qui n'ont jamais eu lieu, et le site affiche
 * des résultats, pas des simulations.
 */
export function bracketsOf(teamIds: readonly string[]): PremierBracket[] {
  const out: PremierBracket[] = [];
  for (let i = 0; i < teamIds.length; i += BRACKET_SIZE) {
    out.push({
      name: `Bracket ${String.fromCharCode(65 + out.length)}`,
      teamIds: teamIds.slice(i, i + BRACKET_SIZE),
    });
  }
  return out;
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
