/**
 * Limitation de débit en mémoire, par fenêtre glissante.
 *
 * Elle protège les appels sortants vers HenrikDev : sans elle, n'importe quel
 * compte connecté pouvait consommer le quota de la clé API en re-soumettant
 * son Riot ID en boucle. Le process est unique (pm2 `instances: 1`,
 * `exec_mode: fork`), le compteur est donc bien global au serveur ; si le jour
 * venu l'application passe en cluster, ce module est le seul point à remplacer
 * par un compteur partagé.
 */

export type RateLimitRule = { limit: number; windowMs: number };

/** Vérification d'un Riot ID : coûteuse côté API, rare côté usage légitime. */
export const RIOT_CHECK_RULE: RateLimitRule = { limit: 5, windowMs: 10 * 60 * 1000 };

/**
 * Dépôt d'image (logo d'équipe, photo de joueur) : chaque envoi déclenche un
 * redimensionnement `sharp` et une écriture disque. L'action est déjà derrière
 * une session et une autorisation ; ce plafond borne le seul abus qui reste,
 * un compte qui re-soumet sa propre image en boucle. Large pour l'usage normal.
 */
export const UPLOAD_RULE: RateLimitRule = { limit: 10, windowMs: 60 * 1000 };

/** Au-delà, on purge les clés dont la fenêtre est entièrement expirée. */
const SWEEP_THRESHOLD = 1000;

export type RateLimitVerdict = { allowed: boolean; hits: number[]; retryAfterMs: number };

/**
 * Décide d'un appel et renvoie l'historique mis à jour. Pure : l'état entre et
 * sort, rien n'est muté — c'est ce qui la rend testable sans horloge factice.
 *
 * @param hits horodatages des appels précédents pour cette clé
 */
export function consume(
  hits: readonly number[],
  rule: RateLimitRule,
  now: number
): RateLimitVerdict {
  const fresh = hits.filter((t) => now - t < rule.windowMs);
  if (fresh.length >= rule.limit) {
    // Le plus ancien appel de la fenêtre libère la place en sortant.
    const retryAfterMs = rule.windowMs - (now - Math.min(...fresh));
    return { allowed: false, hits: fresh, retryAfterMs };
  }
  return { allowed: true, hits: [...fresh, now], retryAfterMs: 0 };
}

const store = new Map<string, number[]>();

/** Retire les clés sans appel récent, pour que la table ne grossisse pas sans fin. */
function sweep(rule: RateLimitRule, now: number): void {
  for (const [key, hits] of store) {
    if (hits.every((t) => now - t >= rule.windowMs)) store.delete(key);
  }
}

/**
 * Enregistre un appel pour cette clé. Renvoie `false` si le quota est atteint,
 * auquel cas l'appelant doit refuser l'action.
 */
export function allow(key: string, rule: RateLimitRule = RIOT_CHECK_RULE): boolean {
  const now = Date.now();
  if (store.size > SWEEP_THRESHOLD) sweep(rule, now);
  const verdict = consume(store.get(key) ?? [], rule, now);
  store.set(key, verdict.hits);
  return verdict.allowed;
}

/** Remet le compteur à zéro. Réservé aux tests. */
export function resetRateLimits(): void {
  store.clear();
}
