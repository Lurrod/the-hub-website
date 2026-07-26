import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

export function proxy(request: NextRequest) {
  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));
  const path = request.nextUrl.pathname;
  const isGestion = path.includes("/gestion");

  // Backstop auth sur les routes de gestion.
  if (isGestion && !hasSession) {
    const signInUrl = new URL("/api/auth/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(signInUrl);
  }

  // Gate onboarding : connecté mais pas de cookie `onboarded` -> /onboarding.
  if (hasSession && !request.cookies.has("onboarded") && path !== "/onboarding") {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Toutes les routes applicatives sauf API, assets Next et fichiers statiques.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|logo.png).*)"],
};
