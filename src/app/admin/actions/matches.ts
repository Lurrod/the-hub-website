"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { allow } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { assertCanManageTournament } from "@/lib/server-auth";
import { logger, describeError } from "@/lib/logger";
import { STAGES_BY_FORMAT, formatAllowsGroups } from "@/lib/constants";
import { flashCodeFromError } from "@/lib/form-errors";
import { matchGroupIdFor } from "@/lib/bracket";
import { hasRiotStats } from "@/lib/match-stats-core";
import {
  matchInputSchema,
  matchMapImportSchema,
  matchMapSchema,
  type MatchMapImportInput,
} from "@/lib/validation/match";
import {
  createGroup,
  deleteGroup,
  assignParticipantGroup,
  createMatch,
  updateMatch,
  deleteMatch,
  addMatchMap,
  removeMatchMap,
  syncMatchScoreFromMaps,
  getMatch,
} from "@/lib/data/matches";
import {
  fetchAndStoreMatchStats,
  importMatchMapFromRiotId,
  type ManualImportResult,
} from "@/lib/match-stats";

async function assertMatchInTournament(matchId: string, tournamentId: string) {
  const match = await getMatch(matchId);
  if (!match || match.tournamentId !== tournamentId) throw new Error("NOT_FOUND");
  return match;
}

async function assertGroupInTournament(groupId: string, tournamentId: string) {
  const group = await db.group.findUnique({ where: { id: groupId } });
  if (!group || group.tournamentId !== tournamentId) throw new Error("INVALID_GROUP");
}

/**
 * Les deux équipes d'un match doivent être inscrites au tournoi.
 *
 * Sans ce contrôle, un match entre équipes non inscrites s'affichait dans
 * `/matchs` et dans l'historique des deux équipes, mais restait invisible du
 * classement — `computeStandings` ne connaît que les participants. Une
 * incohérence sans message d'erreur, donc indiagnosticable.
 */
async function areBothRegistered(
  tournamentId: string,
  teamAId: string,
  teamBId: string
): Promise<boolean> {
  const count = await db.tournamentParticipant.count({
    where: { tournamentId, teamId: { in: [teamAId, teamBId] } },
  });
  return count === 2;
}

function parseMatchForm(formData: FormData) {
  return matchInputSchema.parse({
    teamAId: formData.get("teamAId"),
    teamBId: formData.get("teamBId"),
    scoreA: formData.get("scoreA") || 0,
    scoreB: formData.get("scoreB") || 0,
    stage: formData.get("stage") || "GROUP",
    status: formData.get("status") || "SCHEDULED",
    bestOf: formData.get("bestOf") || 1,
    forfeit: formData.get("forfeit") || "NONE",
    groupId: formData.get("groupId") || undefined,
    round: formData.get("round") || undefined,
    bracketPosition: formData.get("bracketPosition") || undefined,
    date: formData.get("date") || undefined,
    vodUrl: formData.get("vodUrl") || undefined,
  });
}

function revalidateCompetition(tournamentId: string) {
  revalidatePath(`/tournois/${tournamentId}/gestion/competition`);
  revalidatePath(`/tournois/${tournamentId}`);
}

/**
 * Toucher aux maps change le score de la série : le tournoi (classement,
 * arbre) doit être rafraîchi au même titre que la fiche du match.
 */
function revalidateMatch(tournamentId: string, matchId: string) {
  revalidatePath(`/matchs/${matchId}`);
  revalidatePath(`/tournois/${tournamentId}/gestion/matchs/${matchId}`);
  revalidateCompetition(tournamentId);
}

export async function createGroupAction(tournamentId: string, formData: FormData) {
  await assertCanManageTournament(tournamentId);
  const base = `/tournois/${tournamentId}/gestion/competition`;
  const t = await db.tournament.findUnique({
    where: { id: tournamentId },
    select: { format: true },
  });
  if (t && !formatAllowsGroups(t.format)) redirect(`${base}?error=nogroups`);
  const name = String(formData.get("name") ?? "").trim();
  if (name) await createGroup(tournamentId, name);
  revalidateCompetition(tournamentId);
  redirect(base);
}

export async function deleteGroupAction(tournamentId: string, groupId: string) {
  await assertCanManageTournament(tournamentId);
  await deleteGroup(groupId, tournamentId);
  revalidateCompetition(tournamentId);
}

export async function assignParticipantGroupAction(
  tournamentId: string,
  teamId: string,
  formData: FormData
) {
  await assertCanManageTournament(tournamentId);
  const raw = String(formData.get("groupId") ?? "").trim();
  // Même garde que pour les matchs : sans elle, un organisateur pouvait
  // rattacher un participant à la poule d'un tournoi qu'il ne gère pas.
  if (raw !== "") await assertGroupInTournament(raw, tournamentId);
  await assignParticipantGroup(tournamentId, teamId, raw === "" ? null : raw);
  revalidateCompetition(tournamentId);
}

export async function createMatchAction(tournamentId: string, formData: FormData) {
  await assertCanManageTournament(tournamentId);
  const base = `/tournois/${tournamentId}/gestion/competition`;
  let data: ReturnType<typeof parseMatchForm>;
  try {
    data = parseMatchForm(formData);
  } catch (e) {
    redirect(`${base}?error=${flashCodeFromError(e)}`);
  }
  const t = await db.tournament.findUnique({
    where: { id: tournamentId },
    select: { format: true },
  });
  if (!t) redirect(base);
  if (!STAGES_BY_FORMAT[t.format].includes(data.stage)) redirect(`${base}?error=stage`);
  if (!(await areBothRegistered(tournamentId, data.teamAId, data.teamBId))) {
    redirect(`${base}?error=notregistered`);
  }
  // Le groupe persisté dépend du format (bracket parallèle en Premier
  // Contender) : on contrôle l'appartenance de celui qui sera réellement
  // écrit, pas seulement celui des phases de poule.
  const groupId = matchGroupIdFor(t.format, data.stage, data.groupId);
  if (groupId) await assertGroupInTournament(groupId, tournamentId);
  await createMatch(tournamentId, data, t.format);
  revalidateCompetition(tournamentId);
  redirect(base);
}

export async function updateMatchAction(tournamentId: string, matchId: string, formData: FormData) {
  await assertCanManageTournament(tournamentId);
  const before = await assertMatchInTournament(matchId, tournamentId);
  const editBase = `/tournois/${tournamentId}/gestion/matchs/${matchId}`;
  let data: ReturnType<typeof parseMatchForm>;
  try {
    data = parseMatchForm(formData);
  } catch (e) {
    redirect(`${editBase}?error=${flashCodeFromError(e)}`);
  }
  const t = await db.tournament.findUnique({
    where: { id: tournamentId },
    select: { format: true },
  });
  if (!t) redirect(editBase);
  if (!STAGES_BY_FORMAT[t.format].includes(data.stage)) redirect(`${editBase}?error=stage`);
  if (!(await areBothRegistered(tournamentId, data.teamAId, data.teamBId))) {
    redirect(`${editBase}?error=notregistered`);
  }
  // Même règle qu'à la création : contrôler le groupe réellement persisté.
  const groupId = matchGroupIdFor(t.format, data.stage, data.groupId);
  if (groupId) await assertGroupInTournament(groupId, tournamentId);
  await updateMatch(matchId, tournamentId, data, t.format);

  // La recherche automatique REMPLACE toutes les maps du match. On ne la
  // déclenche donc que sur la bascule vers « Terminé », et jamais quand un
  // scoreboard Riot est déjà rattaché : sans ça, corriger une date effaçait
  // les maps importées à la main. La relance reste possible à la demande via
  // `refetchMatchStatsAction`.
  const becomesFinished = data.status === "FINISHED" && before.status !== "FINISHED";
  // Un forfait ne se joue pas : aucune partie custom à chercher côté Riot.
  if (becomesFinished && !hasRiotStats(before.statsStatus) && data.forfeit === "NONE") {
    // `after` : la recherche interroge HenrikDev jusqu'à quatre fois, avec un
    // délai d'attente de 8 s chacune. La faire dans le cycle de requête
    // ajoutait jusqu'à une demi-minute au simple fait d'enregistrer un match.
    // Elle tourne donc une fois la réponse envoyée ; le scoreboard apparaît à
    // la navigation suivante.
    after(async () => {
      await tryFetchStats(matchId);
      revalidateMatch(tournamentId, matchId);
    });
  }
  revalidateCompetition(tournamentId);
  revalidatePath(`/matchs/${matchId}`);
  revalidatePath(editBase);
}

/** Ne jamais casser l'action sur une erreur de récupération : l'appel sortant
 *  vers HenrikDev est le point le plus fragile du flux. */
async function tryFetchStats(matchId: string): Promise<void> {
  try {
    await fetchAndStoreMatchStats(matchId);
  } catch (e) {
    logger.error("match.stats.fetch_failed", { matchId, ...describeError(e) });
  }
}

/**
 * Relance explicite de la recherche automatique, à la demande d'un
 * organisateur. Destructif par nature : toutes les maps du match sont
 * remplacées par celles trouvées côté Riot, d'où la confirmation côté UI.
 */
export async function refetchMatchStatsAction(tournamentId: string, matchId: string) {
  const user = await assertCanManageTournament(tournamentId);
  await assertMatchInTournament(matchId, tournamentId);
  const editBase = `/tournois/${tournamentId}/gestion/matchs/${matchId}`;
  if (!allow(`riotmatch:${user.id}`)) redirect(`${editBase}?error=ratelimited`);
  await tryFetchStats(matchId);
  revalidateMatch(tournamentId, matchId);
  redirect(`/tournois/${tournamentId}/gestion/matchs/${matchId}?ok=stats-refetched`);
}

export async function deleteMatchAction(tournamentId: string, matchId: string) {
  await assertCanManageTournament(tournamentId);
  await deleteMatch(matchId, tournamentId);
  revalidateCompetition(tournamentId);
}

export async function addMatchMapAction(tournamentId: string, matchId: string, formData: FormData) {
  await assertCanManageTournament(tournamentId);
  await assertMatchInTournament(matchId, tournamentId);
  const data = matchMapSchema.parse({
    mapName: formData.get("mapName"),
    scoreA: formData.get("scoreA") || 0,
    scoreB: formData.get("scoreB") || 0,
    order: formData.get("order") || 0,
  });
  await addMatchMap(matchId, data);
  await syncMatchScoreFromMaps(matchId);
  revalidateMatch(tournamentId, matchId);
}

/** Code de retour d'URL pour chaque issue d'un import manuel. */
const IMPORT_FLASH: Record<ManualImportResult, string> = {
  IMPORTED: "ok=map-imported",
  DUPLICATE: "error=riotmatchduplicate",
  NOT_FOUND: "error=riotmatchnotfound",
  RATE_LIMITED: "error=ratelimited",
  API_ERROR: "error=riotapi",
  NO_WINNER: "error=riotmatchnowinner",
};

/**
 * Rattrapage manuel : l'admin colle l'identifiant d'une partie Riot que la
 * recherche automatique n'a pas su retrouver, et la map est importée avec son
 * scoreboard.
 */
export async function importMatchMapAction(
  tournamentId: string,
  matchId: string,
  formData: FormData
) {
  await assertCanManageTournament(tournamentId);
  await assertMatchInTournament(matchId, tournamentId);
  const editBase = `/tournois/${tournamentId}/gestion/matchs/${matchId}`;

  let data: MatchMapImportInput;
  try {
    data = matchMapImportSchema.parse({
      riotMatchId: formData.get("riotMatchId"),
      outcomeOfTeamA: formData.get("outcomeOfTeamA") || "AUTO",
    });
  } catch {
    redirect(`${editBase}?error=riotmatchformat`);
  }

  let result: ManualImportResult;
  try {
    result = await importMatchMapFromRiotId(matchId, data);
  } catch (e) {
    logger.error("match.stats.manual_import_failed", { matchId, ...describeError(e) });
    redirect(`${editBase}?error=riotapi`);
  }

  revalidatePath(`/matchs/${matchId}`);
  revalidatePath(editBase);
  revalidateCompetition(tournamentId);
  redirect(`${editBase}?${IMPORT_FLASH[result]}`);
}

export async function removeMatchMapAction(tournamentId: string, matchId: string, mapId: string) {
  await assertCanManageTournament(tournamentId);
  await assertMatchInTournament(matchId, tournamentId);
  await removeMatchMap(mapId, matchId);
  await syncMatchScoreFromMaps(matchId);
  revalidateMatch(tournamentId, matchId);
}
