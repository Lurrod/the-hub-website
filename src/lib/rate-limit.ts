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

/**
 * La règle voyage avec les horodatages.
 *
 * Le magasin ne portait que les horodatages, et le balayage tranchait sur la
 * fenêtre de la règle en cours d'appel — pas sur celle de la clé examinée. Or
 * quatre règles se partagent cette table, de 60 s (images rendues à la volée,
 * dépôts d'image) à 10 minutes (vérification des Riot ID). Un appel porté par
 * une règle courte évinçait donc des compteurs longs encore valides : le quota
 * de 5 vérifications Riot par 10 minutes, seule raison d'être du module,
 * pouvait être remis à zéro toutes les 60 secondes en faisant grossir le
 * magasin au-delà du seuil. Les clés `image:<ip>` naissant à raison d'une par
 * adresse cliente, y parvenir ne demandait qu'un flot distribué.
 */
type Entree = { rule: RateLimitRule; hits: number[] };

const store = new Map<string, Entree>();

/** Retire les clés sans appel récent, chacune jugée sur SA fenêtre. */
function sweep(now: number): void {
  for (const [key, entree] of store) {
    if (entree.hits.every((t) => now - t >= entree.rule.windowMs)) store.delete(key);
  }
}

/**
 * Enregistre un appel pour cette clé. Renvoie `false` si le quota est atteint,
 * auquel cas l'appelant doit refuser l'action.
 */
export function allow(key: string, rule: RateLimitRule = RIOT_CHECK_RULE): boolean {
  const now = Date.now();
  if (store.size > SWEEP_THRESHOLD) sweep(now);
  const verdict = consume(store.get(key)?.hits ?? [], rule, now);
  store.set(key, { rule, hits: verdict.hits });
  return verdict.allowed;
}

/** Remet le compteur à zéro. Réservé aux tests. */
export function resetRateLimits(): void {
  store.clear();
}

/** Plafond de rendu d'images par adresse et par minute, sans configuration. */
const IMAGE_RENDER_DEFAUT = 30;

/**
 * Plafond des routes d'image rendues à la volée, configurable par
 * `IMAGE_RENDER_LIMIT`.
 *
 * Le seau est keyé sur l'adresse cliente, et « une adresse » ne veut pas
 * partout dire « un visiteur ». En production Apache pose un
 * `X-Forwarded-For` distinct par client et la valeur par défaut vise ce cas ;
 * mais derrière un NAT partagé, ou dans la suite de parcours où tout part de
 * la boucle locale, des dizaines de requêtes légitimes tombent dans le même
 * seau — les tests de carte de partage l'ont payé en 429.
 *
 * Le cas limite qui a dicté le garde-fou : `Number("beaucoup")` vaut `NaN`, et
 * un `NaN` propagé jusqu'à `consume` rend `fresh.length >= rule.limit`
 * toujours faux. Un plafond mal saisi supprimerait donc la limite au lieu de
 * la resserrer, exactement l'inverse de l'intention.
 */
export function imageRenderRule(brut: string | undefined): RateLimitRule {
  const valeur = Number(brut);
  const limit = Number.isInteger(valeur) && valeur > 0 ? valeur : IMAGE_RENDER_DEFAUT;
  return { limit, windowMs: 60 * 1000 };
}
