import { after } from "next/server";
import { clientIp, isBot, isCountable, normalizePath, visitorHash, dayOf } from "@/lib/audience";
import { recordView, purgeOldVisitors } from "@/lib/data/audience";
import { allow, type RateLimitRule } from "@/lib/rate-limit";
import { describeError, logger } from "@/lib/logger";

/**
 * Réception d'une page vue.
 *
 * Le signalement part du navigateur, une fois la page rendue. C'est ce qui
 * distingue une visite réelle d'un préchargement de lien : Next précharge le
 * rendu serveur des pages survolées, un comptage côté serveur les prendrait
 * toutes pour des visites. Le corollaire assumé est qu'un visiteur sans
 * JavaScript n'est pas compté — la mesure ne conditionne aucun contenu.
 *
 * La réponse est toujours 204, même sur une entrée refusée : ce point d'entrée
 * ne doit rien apprendre à qui le sonde, et le navigateur n'a rien à en faire.
 */

/** Un même visiteur ne peut pas déclarer plus de pages que ça en dix minutes. */
const AUDIENCE_RULE: RateLimitRule = { limit: 120, windowMs: 10 * 60 * 1000 };

/** Le corps attendu est un chemin. Au-delà, on ne lit même pas. */
const MAX_BODY_BYTES = 1024;

/** Une purge sur mille signalements suffit à contenir la table des empreintes. */
const PURGE_ODDS = 1000;

const NO_CONTENT = new Response(null, { status: 204 });

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return NO_CONTENT;

  const userAgent = request.headers.get("user-agent");
  if (isBot(userAgent)) return NO_CONTENT;

  const body = await request.text().catch(() => "");
  if (body.length > MAX_BODY_BYTES) return NO_CONTENT;

  const path = normalizePath(body);
  if (!path || !isCountable(path)) return NO_CONTENT;

  const ip = clientIp(request.headers.get("x-forwarded-for"), request.headers.get("x-real-ip"));
  if (!allow(`audience:${ip}`, AUDIENCE_RULE)) return NO_CONTENT;

  const now = new Date();
  const hash = visitorHash(ip, userAgent ?? "", dayOf(now), secret);

  // L'écriture est différée : le navigateur n'attend pas, et une base lente ne
  // retient pas la requête. Un échec ne coûte qu'un point de mesure, jamais
  // une erreur visible.
  after(async () => {
    try {
      await recordView(path, hash, now);
      // Purge opportuniste plutôt qu'une tâche planifiée de plus : la table ne
      // grossit que si le site est visité, autant la nettoyer au même rythme.
      if (Math.floor(Math.random() * PURGE_ODDS) === 0) await purgeOldVisitors(now);
    } catch (error) {
      logger.warn("audience.record_failed", { path, ...describeError(error) });
    }
  });

  return NO_CONTENT;
}
