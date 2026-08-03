"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assertCanManageTournament } from "@/lib/server-auth";
import { logger, describeError } from "@/lib/logger";
import { STAGES_BY_FORMAT, formatAllowsGroups } from "@/lib/constants";
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

function parseMatchForm(formData: FormData) {
  return matchInputSchema.parse({
    teamAId: formData.get("teamAId"),
    teamBId: formData.get("teamBId"),
    scoreA: formData.get("scoreA") || 0,
    scoreB: formData.get("scoreB") || 0,
    stage: formData.get("stage") || "GROUP",
    status: formData.get("status") || "SCHEDULED",
    bestOf: formData.get("bestOf") || 1,
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

export async function createGroupAction(tournamentId: string, formData: FormData) {
  await assertCanManageTournament(tournamentId);
  const base = `/tournois/${tournamentId}/gestion/competition`;
  const t = await db.tournament.findUnique({ where: { id: tournamentId }, select: { format: true } });
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

export async function assignParticipantGroupAction(tournamentId: string, teamId: string, formData: FormData) {
  await assertCanManageTournament(tournamentId);
  const raw = String(formData.get("groupId") ?? "").trim();
  await assignParticipantGroup(tournamentId, teamId, raw === "" ? null : raw);
  revalidateCompetition(tournamentId);
}

export async function createMatchAction(tournamentId: string, formData: FormData) {
  await assertCanManageTournament(tournamentId);
  const base = `/tournois/${tournamentId}/gestion/competition`;
  let data: ReturnType<typeof parseMatchForm>;
  try {
    data = parseMatchForm(formData);
  } catch {
    redirect(`${base}?error=invalid`);
  }
  const t = await db.tournament.findUnique({ where: { id: tournamentId }, select: { format: true } });
  if (t && !STAGES_BY_FORMAT[t.format].includes(data.stage)) redirect(`${base}?error=stage`);
  if (data.stage === "GROUP" && data.groupId) await assertGroupInTournament(data.groupId, tournamentId);
  await createMatch(tournamentId, data);
  revalidateCompetition(tournamentId);
  redirect(base);
}

export async function updateMatchAction(tournamentId: string, matchId: string, formData: FormData) {
  await assertCanManageTournament(tournamentId);
  await assertMatchInTournament(matchId, tournamentId);
  const editBase = `/tournois/${tournamentId}/gestion/matchs/${matchId}`;
  let data: ReturnType<typeof parseMatchForm>;
  try {
    data = parseMatchForm(formData);
  } catch {
    redirect(`${editBase}?error=invalid`);
  }
  const t = await db.tournament.findUnique({ where: { id: tournamentId }, select: { format: true } });
  if (t && !STAGES_BY_FORMAT[t.format].includes(data.stage)) redirect(`${editBase}?error=stage`);
  if (data.stage === "GROUP" && data.groupId) await assertGroupInTournament(data.groupId, tournamentId);
  await updateMatch(matchId, tournamentId, data);
  if (data.status === "FINISHED") {
    try {
      await fetchAndStoreMatchStats(matchId);
    } catch (e) {
      // Ne jamais casser la validation du match sur une erreur de récupération :
      // l'appel sortant vers HenrikDev est le point le plus fragile du flux.
      logger.error("match.stats.fetch_failed", { matchId, ...describeError(e) });
    }
  }
  revalidateCompetition(tournamentId);
  revalidatePath(`/matchs/${matchId}`);
  revalidatePath(editBase);
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
  revalidatePath(`/matchs/${matchId}`);
  revalidatePath(`/tournois/${tournamentId}/gestion/matchs/${matchId}`);
}

/** Code de retour d'URL pour chaque issue d'un import manuel. */
const IMPORT_FLASH: Record<ManualImportResult, string> = {
  IMPORTED: "ok=map-imported",
  DUPLICATE: "error=riotmatchduplicate",
  NOT_FOUND: "error=riotmatchnotfound",
  RATE_LIMITED: "error=ratelimited",
  API_ERROR: "error=riotapi",
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
      campOfTeamA: formData.get("campOfTeamA") || "AUTO",
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
  revalidatePath(`/matchs/${matchId}`);
  revalidatePath(`/tournois/${tournamentId}/gestion/matchs/${matchId}`);
}
