import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server-auth";
import { getPlayerByUserId } from "@/lib/data/players";

/**
 * Referme le gate d'onboarding : pose le cookie `onboarded` puis renvoie à
 * l'accueil.
 *
 * Pourquoi une route et non la page : un Server Component n'a pas le droit
 * d'écrire un cookie, seuls une Server Action et un Route Handler le peuvent.
 * `/onboarding` tentait de le faire et levait « Cookies can only be modified
 * in a Server Action or Route Handler » dès qu'un compte déjà lié y passait.
 *
 * Redirections RELATIVES, jamais construites depuis `request.url` : dans un
 * Route Handler celui-ci porte l'URL interne vue par Node, soit
 * `http://localhost:3200/...` derrière l'Apache du Kimsufi. Une redirection
 * absolue bâtie dessus renvoyait le visiteur sur localhost. Le proxy, lui,
 * peut utiliser `request.url` : en middleware Next le reconstruit à partir de
 * `X-Forwarded-Host`.
 */
function redirectTo(path: string): NextResponse {
  return new NextResponse(null, { status: 307, headers: { Location: path } });
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return redirectTo("/api/auth/signin");

  // Le cookie n'est posé que si le Riot ID est réellement lié : sinon il
  // suffirait de visiter cette URL pour sauter l'onboarding.
  const player = await getPlayerByUserId(user.id);
  if (!player?.puuid) return redirectTo("/onboarding");

  const res = redirectTo("/");
  res.cookies.set("onboarded", "1", {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    // Aucun script n'a besoin de lire ce cookie : le rendre inaccessible au
    // JavaScript évite qu'un `document.cookie = "onboarded=1"` suffise à
    // franchir le gate, et `secure` l'empêche de partir en clair.
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
