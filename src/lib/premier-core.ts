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
 */
export function seasonOfMatch(seasons: readonly PremierSeason[], startedAt: string): string | null {
  const t = Date.parse(startedAt);
  if (Number.isNaN(t)) return null;
  const hit = seasons.find((s) => {
    const from = Date.parse(s.startsAt);
    const to = Date.parse(s.endsAt);
    return !Number.isNaN(from) && !Number.isNaN(to) && t >= from && t <= to;
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

/** Quota relevé sur l'en-tête `X-RateLimit-Limit` : 30 crédits par 60 s. */
export const RATE_BUDGET = 30;
export const RATE_WINDOW_MS = 60_000;

/**
 * Attente à respecter avant le prochain appel HenrikDev.
 *
 * Un appel coûte environ deux crédits : les requêtes que HenrikDev relaie vers
 * Riot sont comptées elles aussi. Enchaîner sans attendre garantit une rafale
 * de 429 au bout d'une quinzaine de requêtes — et la synchronisation en fait
 * plus de soixante-dix rien que pour lire les historiques.
 */
export function nextDelayMs(w: { spent: number; elapsedMs: number }): number {
  if (w.spent < RATE_BUDGET) return 0;
  return Math.max(0, RATE_WINDOW_MS - w.elapsedMs);
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
