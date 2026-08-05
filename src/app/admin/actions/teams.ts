"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, assertCanManageTeam, assertCanAdministerTeam } from "@/lib/server-auth";
import { parseManagerRole } from "@/lib/manager-roles";
import { db } from "@/lib/db";
import { teamInputSchema, rosterEntrySchema } from "@/lib/validation/team";
import {
  createTeam,
  updateTeam,
  deleteTeam,
  setTeamLogo,
  addTeamManager,
  removeTeamManagerIfNotLast,
  setTeamManagerRole,
  addInitialRoster,
} from "@/lib/data/teams";
import { validateImageUpload, processAndStoreImage } from "@/lib/images";
import { flashCodeFromError } from "@/lib/form-errors";

function parseTeamForm(formData: FormData) {
  const raw = {
    name: formData.get("name"),
    tag: formData.get("tag"),
    region: formData.get("region"),
    description: formData.get("description") || undefined,
    status: formData.get("status") || "ACTIVE",
    socials: {
      twitter: formData.get("twitter") || undefined,
      twitch: formData.get("twitch") || undefined,
      youtube: formData.get("youtube") || undefined,
      instagram: formData.get("instagram") || undefined,
      discord: formData.get("discord") || undefined,
      website: formData.get("website") || undefined,
    },
  };
  return teamInputSchema.parse(raw);
}

/** Lit les lignes de roster envoyées par le formulaire (pseudo[] + role[]). */
function parseRoster(formData: FormData) {
  const pseudos = formData.getAll("rosterPseudo").map(String);
  const roles = formData.getAll("rosterRole").map(String);
  const entries = [];
  for (let i = 0; i < pseudos.length; i++) {
    if (pseudos[i].trim() === "") continue;
    const parsed = rosterEntrySchema.safeParse({ pseudo: pseudos[i], role: roles[i] ?? "JOUEUR" });
    if (parsed.success) entries.push(parsed.data);
  }
  return entries;
}

async function maybeStoreLogo(formData: FormData, teamId: string): Promise<void> {
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) return;
  const check = validateImageUpload({ type: file.type, size: file.size });
  if (!check.ok) throw new Error(check.error);
  const buffer = Buffer.from(await file.arrayBuffer());
  const key = await processAndStoreImage(buffer, "teams", teamId);
  await setTeamLogo(teamId, key);
}

export async function createTeamAction(formData: FormData) {
  const admin = await requireAdmin();
  let data: ReturnType<typeof parseTeamForm>;
  try {
    data = parseTeamForm(formData);
  } catch (e) {
    redirect(`/admin/equipes/nouvelle?error=${flashCodeFromError(e)}`);
  }
  const roster = parseRoster(formData);
  const team = await createTeam(data, admin.id);
  await maybeStoreLogo(formData, team.id);
  await addInitialRoster(team.id, roster);
  revalidatePath("/equipes");
  revalidatePath("/admin/equipes");
  redirect(`/equipes/${team.id}/gestion?ok=team-created`);
}

export async function updateTeamAction(teamId: string, formData: FormData) {
  await assertCanManageTeam(teamId);
  let data: ReturnType<typeof parseTeamForm>;
  try {
    data = parseTeamForm(formData);
  } catch (e) {
    redirect(`/equipes/${teamId}/gestion?error=${flashCodeFromError(e)}`);
  }
  await updateTeam(teamId, data);
  await maybeStoreLogo(formData, teamId);
  revalidatePath("/equipes");
  revalidatePath(`/equipes/${teamId}`);
  revalidatePath(`/equipes/${teamId}/gestion`);
  redirect(`/equipes/${teamId}/gestion?ok=team-saved`);
}

export async function deleteTeamAction(teamId: string) {
  // Supprimer l'équipe engage tout son historique : réservé au propriétaire.
  await assertCanAdministerTeam(teamId);
  // Garde anti-cascade : supprimer une équipe efface en cascade ses matchs dans
  // TOUS les tournois. On bloque tant qu'elle a des participations pour ne pas
  // détruire l'historique de tournois gérés par d'autres (seul un admin peut
  // d'abord la désinscrire).
  const participations = await db.tournamentParticipant.count({ where: { teamId } });
  if (participations > 0) redirect(`/equipes/${teamId}/gestion?error=hasparticipations`);
  await deleteTeam(teamId);
  revalidatePath("/equipes");
  revalidatePath("/admin/equipes");
  redirect("/equipes?ok=team-deleted");
}

/** Administrer les managers, c'est distribuer les droits : réservé au propriétaire. */
export async function addManagerAction(teamId: string, formData: FormData) {
  await assertCanAdministerTeam(teamId);
  const base = `/equipes/${teamId}/gestion/managers`;
  const discordId = String(formData.get("discordId") ?? "").trim();
  if (!discordId) redirect(`${base}?error=empty`);
  const user = await db.user.findUnique({ where: { discordId }, select: { id: true } });
  if (!user) redirect(`${base}?error=notfound`);
  await addTeamManager(teamId, user.id, parseManagerRole(formData.get("role")));
  revalidatePath(base);
  redirect(`${base}?ok=manager-added`);
}

export async function removeManagerAction(teamId: string, userId: string) {
  await assertCanAdministerTeam(teamId);
  const base = `/equipes/${teamId}/gestion/managers`;
  const removed = await removeTeamManagerIfNotLast(teamId, userId);
  if (!removed) redirect(`${base}?error=lastowner`);
  revalidatePath(base);
}

export async function setManagerRoleAction(teamId: string, userId: string, formData: FormData) {
  await assertCanAdministerTeam(teamId);
  const base = `/equipes/${teamId}/gestion/managers`;
  const changed = await setTeamManagerRole(teamId, userId, parseManagerRole(formData.get("role")));
  if (!changed) redirect(`${base}?error=lastowner`);
  revalidatePath(base);
  redirect(`${base}?ok=manager-role`);
}
