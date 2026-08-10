import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { buildCsp, generateNonce, CSP_HEADER } from "@/lib/csp";

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

export function proxy(request: NextRequest) {
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
