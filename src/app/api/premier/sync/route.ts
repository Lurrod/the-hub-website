import { z } from "zod";
import { secretMatches, cameFromProxy } from "@/lib/premier-core";
import { runPremierSync } from "@/lib/data/premier";
import { allow, type RateLimitRule } from "@/lib/rate-limit";
import { logger, describeError } from "@/lib/logger";

// La crontab frappe au plus une fois toutes les cinq minutes, et `flock`
// sérialise déjà les passages : ce plafond ne gêne aucun usage légitime, il
// borne un déclencheur qui aurait mis la main sur le secret.
const SYNC_RULE: RateLimitRule = { limit: 6, windowMs: 60 * 1000 };

// La route interroge la base et une API tierce à chaque appel : rien à
// prérendre, et le build de la CI ne doit pas tenter de la joindre.
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  dryRun: z.boolean().default(false),
  // 40 matchs tiennent dans le quota d'un passage sans dépasser le quart
  // d'heure qui sépare deux exécutions du cron.
  matchBudget: z.number().int().min(1).max(2000).default(40),
  // Remonte le miroir de plusieurs saisons. Sert surtout à garnir un
  // environnement de développement : en production, le cron n'a besoin que de
  // la saison en cours.
  seasons: z.number().int().min(1).max(5).default(1),
  // Relire l'historique de toutes les équipes, y compris celles dont le bilan
  // au classement n'a pas bougé. Vrai par défaut : c'est le seul chemin qui
  // voie les participations de playoffs et rattrape un import tombé en échec.
  // La crontab dense du samedi soir est la seule à demander le chemin rapide.
  fullSweep: z.boolean().default(true),
});

/**
 * Déclenche un passage de synchronisation du Premier français.
 *
 * Appelée par la crontab du serveur, sur la boucle locale. Le secret est le
 * seul contrôle d'accès : la route n'a pas de session, et elle écrit en base.
 */
export async function POST(req: Request) {
  // Route réservée à la crontab locale, qui frappe 127.0.0.1 en direct. Un
  // appel venu d'Internet traverse Apache, qui pose des en-têtes X-Forwarded-*.
  // On le traite en 404 : publiquement, la route n'existe pas — inutile de
  // confirmer son existence à qui la sonde.
  if (cameFromProxy((name) => req.headers.get(name))) {
    return new Response("Not found", { status: 404 });
  }

  if (!secretMatches(req.headers.get("authorization"), process.env.PREMIER_SYNC_SECRET ?? "")) {
    // Aucun détail : un message distinguant « secret absent » de « secret
    // faux » renseignerait qui sonde la route.
    return new Response("Unauthorized", { status: 401 });
  }

  // Après le secret : seul un appelant authentifié peut faire tourner le
  // compteur, un flot non authentifié se heurte au 401 sans l'atteindre.
  if (!allow("premier-sync", SYNC_RULE)) {
    return new Response("Too Many Requests", { status: 429 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return new Response("Bad Request", { status: 400 });

  try {
    const report = await runPremierSync(
      parsed.data.matchBudget,
      parsed.data.dryRun,
      parsed.data.seasons,
      parsed.data.fullSweep
    );
    // Le contexte de journalisation n'accepte que des valeurs scalaires : la
    // liste des tournois se réduit à son décompte, l'identifiant de chacun
    // n'ayant pas d'intérêt une fois la synchronisation passée.
    logger.info("premier.sync.done", {
      seasons: report.seasons.length,
      teamsCreated: report.teamsCreated,
      teamsLinked: report.teamsLinked,
      teamsRosterLinked: report.teamsRosterLinked,
      teamsSuspects: report.teamsSuspects.length,
      matchesImported: report.matchesImported,
      matchesFailed: report.matchesFailed,
      matchesPending: report.matchesPending,
      teamsSkipped: report.teamsSkipped,
      rateLimited: report.rateLimited,
    });
    return Response.json(report);
  } catch (e) {
    logger.error("premier.sync.failed", describeError(e));
    return new Response("Sync failed", { status: 500 });
  }
}
