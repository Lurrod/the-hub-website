"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, assertCanManageTeam } from "@/lib/server-auth";
import { playerInputSchema, rosterAddSchema } from "@/lib/validation/player";
import {
  createPlayer,
  updatePlayer,
  deletePlayer,
  getMembership,
  createPlayerAndAddToRoster,
  setMembershipRole,
  endMembership,
  deleteMembership,
} from "@/lib/data/players";
import { storePlayerPhotoFromForm } from "@/lib/player-photo";
import type { MembershipRole } from "@prisma/client";

function parsePlayerForm(formData: FormData) {
  return playerInputSchema.parse({
    pseudo: formData.get("pseudo"),
    nationality: formData.get("nationality") || undefined,
    socials: {
      twitter: formData.get("twitter") || undefined,
      twitch: formData.get("twitch") || undefined,
    },
  });
}

// --- Joueurs (admin) ---
export async function createPlayerAction(formData: FormData) {
  await requireAdmin();
  const data = parsePlayerForm(formData);
  const player = await createPlayer(data);
  await storePlayerPhotoFromForm(formData, player.id);
  redirect(`/admin/joueurs/${player.id}`);
}

export async function updatePlayerAction(playerId: string, formData: FormData) {
  await requireAdmin();
  const data = parsePlayerForm(formData);
  await updatePlayer(playerId, data);
  await storePlayerPhotoFromForm(formData, playerId);
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
  revalidatePath(`/equipes/${teamId}/gestion/roster`);
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
  revalidatePath(`/equipes/${teamId}/gestion/roster`);
  revalidatePath(`/equipes/${teamId}`);
}

export async function endMemberAction(teamId: string, membershipId: string) {
  await assertMembershipInTeam(teamId, membershipId);
  await endMembership(membershipId, new Date());
  revalidatePath(`/equipes/${teamId}/gestion/roster`);
  revalidatePath(`/equipes/${teamId}`);
}

export async function removeMemberAction(teamId: string, membershipId: string) {
  await assertMembershipInTeam(teamId, membershipId);
  await deleteMembership(membershipId);
  revalidatePath(`/equipes/${teamId}/gestion/roster`);
  revalidatePath(`/equipes/${teamId}`);
}
