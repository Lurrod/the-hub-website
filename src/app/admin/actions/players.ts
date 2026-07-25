"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, assertCanManageTeam } from "@/lib/server-auth";
import { playerInputSchema, rosterAddSchema } from "@/lib/validation/player";
import {
  createPlayer,
  updatePlayer,
  deletePlayer,
  setPlayerPhoto,
  getMembership,
  createPlayerAndAddToRoster,
  setMembershipRole,
  endMembership,
  deleteMembership,
} from "@/lib/data/players";
import { validateImageUpload, processAndStoreImage } from "@/lib/images";
import type { MembershipRole } from "@prisma/client";

function parsePlayerForm(formData: FormData) {
  return playerInputSchema.parse({
    pseudo: formData.get("pseudo"),
    realName: formData.get("realName") || undefined,
    nationality: formData.get("nationality") || undefined,
    socials: {
      twitter: formData.get("twitter") || undefined,
      twitch: formData.get("twitch") || undefined,
    },
  });
}

async function maybeStorePhoto(formData: FormData, playerId: string) {
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return;
  const check = validateImageUpload({ type: file.type, size: file.size });
  if (!check.ok) throw new Error(check.error);
  const buffer = Buffer.from(await file.arrayBuffer());
  const key = await processAndStoreImage(buffer, "players", playerId);
  await setPlayerPhoto(playerId, key);
}

// --- Joueurs (admin) ---
export async function createPlayerAction(formData: FormData) {
  await requireAdmin();
  const data = parsePlayerForm(formData);
  const player = await createPlayer(data);
  await maybeStorePhoto(formData, player.id);
  redirect(`/admin/joueurs/${player.id}`);
}

export async function updatePlayerAction(playerId: string, formData: FormData) {
  await requireAdmin();
  const data = parsePlayerForm(formData);
  await updatePlayer(playerId, data);
  await maybeStorePhoto(formData, playerId);
  revalidatePath(`/joueurs/${playerId}`);
}

export async function deletePlayerAction(playerId: string) {
  await requireAdmin();
  await deletePlayer(playerId);
  redirect("/admin/joueurs");
}

// --- Roster (admin OU manager de l'équipe) ---
/** Vérifie l'autorisation ET que le membership appartient bien à cette équipe. */
async function assertMembershipInTeam(teamId: string, membershipId: string) {
  await assertCanManageTeam(teamId);
  const m = await getMembership(membershipId);
  if (!m || m.teamId !== teamId) throw new Error("FORBIDDEN");
  return m;
}

export async function addRosterMemberAction(teamId: string, formData: FormData) {
  await assertCanManageTeam(teamId);
  const data = rosterAddSchema.parse({
    pseudo: formData.get("pseudo"),
    nationality: formData.get("nationality") || undefined,
    role: formData.get("role") || "JOUEUR",
  });
  await createPlayerAndAddToRoster(teamId, data.pseudo, data.nationality, data.role);
  revalidatePath(`/admin/equipes/${teamId}/roster`);
  revalidatePath(`/equipes/${teamId}`);
}

export async function setMemberRoleAction(
  teamId: string,
  membershipId: string,
  formData: FormData
) {
  await assertMembershipInTeam(teamId, membershipId);
  const role = String(formData.get("role") ?? "JOUEUR") as MembershipRole;
  await setMembershipRole(membershipId, role);
  revalidatePath(`/admin/equipes/${teamId}/roster`);
  revalidatePath(`/equipes/${teamId}`);
}

export async function endMemberAction(teamId: string, membershipId: string) {
  await assertMembershipInTeam(teamId, membershipId);
  await endMembership(membershipId, new Date());
  revalidatePath(`/admin/equipes/${teamId}/roster`);
  revalidatePath(`/equipes/${teamId}`);
}

export async function removeMemberAction(teamId: string, membershipId: string) {
  await assertMembershipInTeam(teamId, membershipId);
  await deleteMembership(membershipId);
  revalidatePath(`/admin/equipes/${teamId}/roster`);
  revalidatePath(`/equipes/${teamId}`);
}
