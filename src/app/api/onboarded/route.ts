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
 */
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.redirect(new URL("/api/auth/signin", request.url));

  // Le cookie n'est posé que si le Riot ID est réellement lié : sinon il
  // suffirait de visiter cette URL pour sauter l'onboarding.
  const player = await getPlayerByUserId(user.id);
  if (!player?.puuid) return NextResponse.redirect(new URL("/onboarding", request.url));

  const res = NextResponse.redirect(new URL("/", request.url));
  res.cookies.set("onboarded", "1", {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
