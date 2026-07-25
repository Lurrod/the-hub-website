import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Backstop défense-en-profondeur (Next 16 « proxy », ex-middleware) : exige la
// présence d'un cookie de session (Auth.js v5, stratégie "database") sur les
// routes de gestion. L'autorisation fine (canManageTeam/canManageTournament)
// reste appliquée par les layouts/pages.
const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

export function proxy(request: NextRequest) {
  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));
  if (hasSession) return NextResponse.next();
  const signInUrl = new URL("/api/auth/signin", request.url);
  signInUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
  return NextResponse.redirect(signInUrl);
}

export const config = {
  matcher: [
    "/equipes/:id/gestion",
    "/equipes/:id/gestion/:path*",
    "/tournois/:id/gestion",
    "/tournois/:id/gestion/:path*",
  ],
};
