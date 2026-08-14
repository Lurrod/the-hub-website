import { createHash } from "node:crypto";

/**
 * Mesure d'audience : ce que le site compte, et ce qu'il refuse de savoir.
 *
 * Deux chiffres seulement — pages vues et visiteurs distincts —, agrégés par
 * jour. Aucune ligne n'est écrite par visite : rien ne permet de reconstituer
 * un parcours, de relier deux journées, ni de désigner quelqu'un.
 *
 * Ce fichier ne contient que du calcul pur : la normalisation d'un chemin et
 * le calcul d'une empreinte. Les écritures vivent dans `lib/data/audience`.
 */

/** Longueur maximale d'un chemin retenu. Au-delà, c'est du bruit ou une attaque. */
const MAX_PATH_LENGTH = 512;

/**
 * Gabarits de routes dynamiques du site, du plus spécifique au plus général.
 *
 * Sans eux, `/joueurs/cmsd6mt1k000w…` créerait une ligne par fiche consultée
 * et la table grossirait au rythme du catalogue. On veut savoir que « les
 * fiches joueurs » sont vues, pas laquelle — c'est aussi ce qui garde la
 * mesure anonyme quand une fiche n'a qu'un seul visiteur.
 */
const PATTERNS: readonly { test: RegExp; as: string }[] = [
  { test: /^\/joueurs\/[^/]+$/, as: "/joueurs/[id]" },
  { test: /^\/equipes\/[^/]+\/gestion(\/.*)?$/, as: "/equipes/[id]/gestion" },
  { test: /^\/equipes\/[^/]+$/, as: "/equipes/[id]" },
  { test: /^\/matchs\/[^/]+$/, as: "/matchs/[id]" },
  { test: /^\/tournois\/[^/]+\/gestion(\/.*)?$/, as: "/tournois/[id]/gestion" },
  { test: /^\/tournois\/[^/]+$/, as: "/tournois/[id]" },
  { test: /^\/rejoindre\/[^/]+$/, as: "/rejoindre/[token]" },
];

/**
 * Ramène un chemin à ce qu'on accepte de compter, ou `null` s'il est à jeter.
 *
 * Le chemin vient du navigateur : il est donc traité comme une entrée non
 * fiable. On coupe la chaîne de requête et le fragment — ils portent des
 * filtres de recherche, parfois un pseudo —, on exige une racine absolue, et
 * on refuse tout ce qui dépasse la longueur d'une URL plausible.
 */
export function normalizePath(raw: string | null | undefined): string | null {
  if (!raw || raw.length > MAX_PATH_LENGTH) return null;

  const path = raw.split(/[?#]/)[0];
  if (!path.startsWith("/")) return null;

  // Une barre finale ne désigne pas une autre page ; « / » reste « / ».
  const trimmed = path.length > 1 ? path.replace(/\/+$/, "") : path;
  const clean = trimmed === "" ? "/" : trimmed;

  for (const { test, as } of PATTERNS) {
    if (test.test(clean)) return as;
  }
  return clean;
}

/**
 * Pages qu'on ne compte pas.
 *
 * L'administration n'est pas de l'audience : c'est le trafic de celui qui lit
 * le tableau de bord, et l'y inclure fausserait sa propre lecture.
 */
export function isCountable(path: string): boolean {
  return !path.startsWith("/admin");
}

/** Jour d'une date, à minuit UTC — la clé de tous les compteurs. */
export function dayOf(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** `YYYY-MM-DD` en UTC, forme utilisée dans le sel de l'empreinte. */
export function dayKey(day: Date): string {
  return day.toISOString().slice(0, 10);
}

/**
 * Empreinte d'un visiteur pour une journée.
 *
 * Elle sert uniquement à ne pas compter deux fois la même personne le même
 * jour. Le sel combine un secret du serveur ET la date : sans le secret,
 * l'empreinte est invérifiable même en connaissant l'adresse IP ; avec le
 * changement quotidien, deux journées ne sont pas comparables. Ni l'IP ni
 * l'agent utilisateur ne sont conservés.
 *
 * @param secret secret du serveur (`AUTH_SECRET`), jamais journalisé.
 */
export function visitorHash(ip: string, userAgent: string, day: Date, secret: string): string {
  return createHash("sha256")
    .update(`${secret}:${dayKey(day)}:${ip}:${userAgent}`)
    .digest("hex");
}

/**
 * Adresse du client derrière le reverse proxy.
 *
 * On lit le DERNIER maillon de `x-forwarded-for`, pas le premier. L'en-tête
 * arrive du réseau : un client qui envoie lui-même `X-Forwarded-For: 1.2.3.4`
 * voit mod_proxy_http y AJOUTER l'adresse qu'Apache a réellement vue, ce qui
 * donne `1.2.3.4, <vraie adresse>`. Prendre le premier maillon revenait donc à
 * retenir une valeur que l'appelant choisit : il suffisait de la faire varier
 * pour passer sous le quota de `/api/audience` et pour compter autant de
 * visiteurs distincts que d'envois. Le dernier maillon est celui posé par le
 * proxy de confiance — le seul que le client ne peut pas écrire.
 *
 * Le corollaire est assumé : derrière un second proxy (un CDN placé devant
 * Apache), c'est l'adresse du CDN qui serait retenue. Il faudrait alors compter
 * les intermédiaires de confiance, ce qui n'a pas lieu d'être ici où Apache est
 * seul en frontal.
 *
 * L'adresse n'est jamais conservée : elle ne sert qu'au calcul d'une empreinte.
 */
export function clientIp(forwardedFor: string | null, realIp: string | null): string {
  const hops = forwardedFor?.split(",") ?? [];
  const last = hops[hops.length - 1]?.trim();
  return last || realIp?.trim() || "inconnu";
}

/**
 * Robots les plus courants, écartés du comptage.
 *
 * Un signalement d'audience part du JavaScript de la page : la plupart des
 * robots ne l'exécutent pas et ne se présentent donc jamais ici. Ce filtre ne
 * couvre que ceux qui rendent la page — navigateurs sans tête des outils
 * d'aperçu et d'indexation.
 */
const BOT_PATTERN = /bot|crawl|spider|slurp|headless|preview|monitor|lighthouse|pingdom|curl|wget/i;

export function isBot(userAgent: string | null | undefined): boolean {
  return !!userAgent && BOT_PATTERN.test(userAgent);
}
