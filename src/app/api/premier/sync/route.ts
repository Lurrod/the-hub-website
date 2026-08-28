import { z } from "zod";
import { secretMatches } from "@/lib/premier-core";
import { runPremierSync } from "@/lib/data/premier";
import { logger, describeError } from "@/lib/logger";

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
  if (!secretMatches(req.headers.get("authorization"), process.env.PREMIER_SYNC_SECRET ?? "")) {
    // Aucun détail : un message distinguant « secret absent » de « secret
    // faux » renseignerait qui sonde la route.
    return new Response("Unauthorized", { status: 401 });
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
