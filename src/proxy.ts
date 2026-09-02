import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { buildCsp, generateNonce, CSP_HEADER } from "@/lib/csp";
import { ficheName } from "@/lib/data/existence";
import { idFromSegment, isCanonicalSegment, fichePath, type FicheSection } from "@/lib/slug";
import { allow, type RateLimitRule } from "@/lib/rate-limit";
import { describeError, logger } from "@/lib/logger";

const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

/**
 * Routes d'image rendues à la volée : carte partageable et images OpenGraph.
 *
 * Chacune enchaîne une requête base, une mise en page Satori, un encodage PNG
 * `sharp` et jusqu'à deux `fetch` de logos — sur un process Node unique, sans
 * cache partagé devant. Publiques et sans session, elles échappent à toute
 * limite : un `?vue=` martelé saturait la boucle d'événements et figeait tout
 * le site. Le suffixe d'extension est optionnel : Next sert l'OG en
 * `/opengraph-image` comme en `/opengraph-image.png`.
 */
const EXPENSIVE_RENDER = /\/(carte|opengraph-image|twitter-image)(\.[a-z0-9]+)?$/i;

export function isRenderExpensivePath(pathname: string): boolean {
  return EXPENSIVE_RENDER.test(pathname);
}

/**
 * Un scraper de partage ne tire qu'une poignée d'images par lien ; ce plafond
 * ne le gêne pas, mais il coupe le martèlement depuis une même adresse. La
 * défense complète contre un flot distribué reste un cache en amont (voir
 * `docs/ops/durcissement-apache.md`).
 */
const IMAGE_RENDER_RULE: RateLimitRule = { limit: 30, windowMs: 60 * 1000 };

/** Dernier maillon du X-Forwarded-For, celui posé par Apache ; jamais le premier, écrit par le client. */
function clientIp(request: NextRequest): string {
  const xff = request.headers.get("x-forwarded-for");
  const last = xff?.split(",").pop()?.trim();
  return last || request.headers.get("x-real-ip")?.trim() || "inconnu";
}

/**
 * Chemins que le gate d'onboarding laisse passer.
 *
 * Les mentions légales, les CGU et la politique de confidentialité doivent
 * rester atteignables à tout moment : ce sont précisément les documents qu'on
 * veut pouvoir lire AVANT de terminer son inscription.
 */
const ONBOARDING_EXEMPT = new Set(["/onboarding", "/cgu", "/confidentialite", "/mentions-legales"]);

export function isOnboardingExempt(path: string): boolean {
  return ONBOARDING_EXEMPT.has(path);
}

/**
 * Fiche publique exacte (`/tournois/<id>`…), sous-chemins exclus : la gestion
 * a son backstop auth plus bas, et `/carte` ou l'image OG dégradent déjà
 * proprement quand l'entité manque.
 */
const FICHE_PATH = /^\/(tournois|equipes|joueurs|matchs)\/([^/]+)$/;

export function parseFichePath(
  path: string
): { section: FicheSection; segment: string; id: string } | null {
  const m = FICHE_PATH.exec(path);
  if (!m) return null;
  const segment = decodeURIComponent(m[2]);
  return { section: m[1] as FicheSection, segment, id: idFromSegment(segment) };
}

/**
 * Cible sans « www. », ou null si l'hôte n'en porte pas.
 *
 * www.the-hub-vrc.fr répondait 200 avec le même contenu que l'apex : deux
 * hôtes indexables pour un même site, le canonical seul devant rattraper la
 * dilution. Le 301 tranche — et vivre ici le rend indépendant de la conf
 * Apache du Kimsufi.
 */
export function stripWwwUrl(url: URL): URL | null {
  if (!url.hostname.startsWith("www.")) return null;
  const target = new URL(url.toString());
  target.hostname = url.hostname.slice(4);
  return target;
}

export async function proxy(request: NextRequest) {
  const www = stripWwwUrl(request.nextUrl);
  if (www) return NextResponse.redirect(www, 301);

  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));
  const path = request.nextUrl.pathname;

  // Limite de débit des images rendues à la volée, avant tout travail : un 429
  // ne doit rien coûter de plus que la lecture de l'en-tête.
  if (
    (request.method === "GET" || request.method === "HEAD") &&
    isRenderExpensivePath(path) &&
    !allow(`image:${clientIp(request)}`, IMAGE_RENDER_RULE)
  ) {
    return new NextResponse("Too Many Requests", {
      status: 429,
      headers: { "Retry-After": "60" },
    });
  }

  // Backstop d'authentification sur la gestion d'équipe/tournoi ET sur l'admin.
  // `/admin` n'était couvert que par le `requireAdmin()` de ses pages : correct,
  // mais c'était la seule barrière. Le proxy tranche désormais avant tout rendu.
  const needsAuth = path.includes("/gestion") || path === "/admin" || path.startsWith("/admin/");

  // Le nonce doit voyager dans les en-têtes de *requête* : c'est là que Next le
  // lit pour le recopier sur ses propres balises <script> et <style>.
  const nonce = generateNonce();
  const csp = buildCsp(nonce, process.env.NODE_ENV === "development");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set(CSP_HEADER, csp);

  // Backstop auth sur les routes de gestion et d'administration.
  if (needsAuth && !hasSession) {
    const signInUrl = new URL("/api/auth/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", path);
    return withCsp(NextResponse.redirect(signInUrl), csp);
  }

  // Gate onboarding : connecté mais pas de cookie `onboarded` -> /onboarding.
  if (hasSession && !request.cookies.has("onboarded") && !isOnboardingExempt(path)) {
    return withCsp(NextResponse.redirect(new URL("/onboarding", request.url)), csp);
  }

  // Vrai 404 sur les fiches inexistantes. Le rendu dynamique streame la
  // coquille (`loading.tsx`) avant que la page n'appelle `notFound()` : le
  // statut restait alors bloqué à 200 (soft-404). On vérifie donc l'existence
  // ICI, avant tout rendu, et on réécrit vers un chemin sans route — Next sert
  // la 404 racine avec le bon statut, comme pour n'importe quelle URL inconnue.
  // GET/HEAD seulement : une Server Function POSTe sur le chemin de sa page.
  if (request.method === "GET" || request.method === "HEAD") {
    const fiche = parseFichePath(path);
    if (fiche) {
      try {
        const nom = await ficheName(fiche.section, fiche.id);
        if (nom === null) {
          return withCsp(NextResponse.rewrite(new URL("/introuvable", request.url)), csp);
        }
        // Une fiche a UNE URL. L'ancienne forme — l'identifiant nu — et les
        // slugs périmés après un renommage continuent de résoudre, mais une
        // redirection permanente ramène vers la forme à jour : deux URLs
        // indexables pour une même page dilueraient le référencement, ce que la
        // redirection `www` vers l'apex évite déjà par ailleurs.
        // Jamais sur une requête RSC. Le routeur de Next va chercher la
        // charge utile de la page suivante avec l'en-tête `RSC: 1` ; une
        // redirection sur cet appel casse la navigation douce et force un
        // rechargement complet — « Failed to fetch RSC payload, falling back
        // to browser navigation » dans la console. Un lien interne pointant
        // l'ancienne forme continue donc de naviguer normalement, et c'est le
        // premier chargement de document qui rétablit l'URL canonique.
        //
        // Ce qui compte pour le référencement est préservé : un robot, un lien
        // partagé et une entrée directe font tous une requête de document.
        const estRsc = request.headers.get("rsc") === "1";
        if (!estRsc && !isCanonicalSegment(fiche.segment, fiche.id, nom)) {
          const cible = new URL(request.url);
          cible.pathname = fichePath(fiche.section, fiche.id, nom);
          return withCsp(NextResponse.redirect(cible, 301), csp);
        }
      } catch (error) {
        // Base indisponible : on laisse la requête suivre son cours, la page
        // portera l'erreur. Le proxy ne doit jamais transformer une panne en 404.
        logger.error("proxy: vérification d'existence impossible", {
          path,
          ...describeError(error),
        });
      }
    }
  }

  return withCsp(NextResponse.next({ request: { headers: requestHeaders } }), csp);
}

/** Recopie la policy sur la réponse : la requête seule ne suffit pas au navigateur. */
function withCsp(response: NextResponse, csp: string): NextResponse {
  response.headers.set(CSP_HEADER, csp);
  return response;
}

export const config = {
  // Toutes les routes applicatives sauf API, assets Next et fichiers statiques.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|logo.webp|logo.png).*)"],
};
