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
  deleteTeamIfUnused,
  setTeamLogo,
  addTeamManager,
  removeTeamManagerIfNotLast,
  setTeamManagerRole,
  addInitialRoster,
  findTeamConflict,
} from "@/lib/data/teams";
import { readUploadedImage, processAndStoreImage, deleteStoredImage } from "@/lib/images";
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
  const buffer = await readUploadedImage(formData.get("logo"));
  if (!buffer) return;
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
  const conflict = await findTeamConflict(data);
  if (conflict) redirect(`/admin/equipes/nouvelle?error=team${conflict}taken`);
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
  const conflict = await findTeamConflict(data, teamId);
  if (conflict) redirect(`/equipes/${teamId}/gestion?error=team${conflict}taken`);
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
  // Garde anti-cascade, tenue en base : supprimer une équipe efface en cascade
  // ses matchs dans TOUS les tournois. `deleteTeamIfUnused` refuse tant qu'il
  // reste une inscription OU un match, et fait le contrôle dans la même
  // transaction que la suppression.
  if (!(await deleteTeamIfUnused(teamId))) {
    redirect(`/equipes/${teamId}/gestion?error=hasparticipations`);
  }
  // Le logo doit partir avec la ligne : sans cela le fichier reste sur le
  // disque et servi par /api/images, dont la clé est devinable (RGPD-01).
  await deleteStoredImage("teams", teamId);
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
