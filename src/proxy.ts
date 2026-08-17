import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { buildCsp, generateNonce, CSP_HEADER } from "@/lib/csp";
import { ficheExists, type FicheSection } from "@/lib/data/existence";
import { describeError, logger } from "@/lib/logger";

const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

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

export function parseFichePath(path: string): { section: FicheSection; id: string } | null {
  const m = FICHE_PATH.exec(path);
  return m ? { section: m[1] as FicheSection, id: decodeURIComponent(m[2]) } : null;
}

export async function proxy(request: NextRequest) {
  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));
  const path = request.nextUrl.pathname;
  const isGestion = path.includes("/gestion");

  // Le nonce doit voyager dans les en-têtes de *requête* : c'est là que Next le
  // lit pour le recopier sur ses propres balises <script> et <style>.
  const nonce = generateNonce();
  const csp = buildCsp(nonce, process.env.NODE_ENV === "development");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set(CSP_HEADER, csp);

  // Backstop auth sur les routes de gestion.
  if (isGestion && !hasSession) {
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
        if (!(await ficheExists(fiche.section, fiche.id))) {
          return withCsp(NextResponse.rewrite(new URL("/introuvable", request.url)), csp);
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
