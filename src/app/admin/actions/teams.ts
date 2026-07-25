"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, assertCanManageTeam } from "@/lib/server-auth";
import { db } from "@/lib/db";
import { teamInputSchema } from "@/lib/validation/team";
import {
  createTeam,
  updateTeam,
  deleteTeam,
  setTeamLogo,
  addTeamManager,
  removeTeamManager,
} from "@/lib/data/teams";
import { validateImageUpload, processAndStoreImage } from "@/lib/images";

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
      website: formData.get("website") || undefined,
    },
  };
  return teamInputSchema.parse(raw);
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
  const data = parseTeamForm(formData);
  const team = await createTeam(data, admin.id);
  await maybeStoreLogo(formData, team.id);
  revalidatePath("/equipes");
  revalidatePath("/admin/equipes");
  redirect(`/equipes/${team.id}/gestion`);
}

export async function updateTeamAction(teamId: string, formData: FormData) {
  await assertCanManageTeam(teamId);
  const data = parseTeamForm(formData);
  await updateTeam(teamId, data);
  await maybeStoreLogo(formData, teamId);
  revalidatePath("/equipes");
  revalidatePath(`/equipes/${teamId}`);
  revalidatePath(`/equipes/${teamId}/gestion`);
}

export async function deleteTeamAction(teamId: string) {
  await assertCanManageTeam(teamId);
  await deleteTeam(teamId);
  revalidatePath("/equipes");
  revalidatePath("/admin/equipes");
  redirect("/equipes");
}

export async function addManagerAction(teamId: string, formData: FormData) {
  await assertCanManageTeam(teamId);
  const base = `/equipes/${teamId}/gestion/managers`;
  const discordId = String(formData.get("discordId") ?? "").trim();
  if (!discordId) redirect(`${base}?error=empty`);
  const user = await db.user.findUnique({ where: { discordId }, select: { id: true } });
  if (!user) redirect(`${base}?error=notfound`);
  await addTeamManager(teamId, user.id);
  revalidatePath(base);
  redirect(base);
}

export async function removeManagerAction(teamId: string, userId: string) {
  await assertCanManageTeam(teamId);
  const base = `/equipes/${teamId}/gestion/managers`;
  const count = await db.teamManager.count({ where: { teamId } });
  if (count <= 1) redirect(`${base}?error=lastmanager`);
  await removeTeamManager(teamId, userId);
  revalidatePath(base);
}
