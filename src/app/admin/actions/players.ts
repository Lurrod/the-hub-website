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
  setPlayerRiotAccount,
} from "@/lib/data/players";
import { resolveRiotAccount, riotFlashCode } from "@/lib/riot-account";
import { storePlayerPhotoFromForm } from "@/lib/player-photo";
import { deleteStoredImage } from "@/lib/images";
import { flashCodeFromError } from "@/lib/form-errors";
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
  let data: ReturnType<typeof parsePlayerForm>;
  try {
    data = parsePlayerForm(formData);
  } catch (e) {
    redirect(`/admin/joueurs?error=${flashCodeFromError(e)}`);
  }
  const player = await createPlayer(data);
  await storePlayerPhotoFromForm(formData, player.id);
  const riotInput = String(formData.get("riotId") ?? "").trim();
  if (riotInput) {
    try {
      const account = await resolveRiotAccount(riotInput, { excludePlayerId: player.id });
      await setPlayerRiotAccount(player.id, account);
    } catch (e) {
      redirect(`/admin/joueurs/${player.id}?error=${riotFlashCode(e)}`);
    }
  }
  redirect(`/admin/joueurs/${player.id}?ok=player-created`);
}

export async function updatePlayerAction(playerId: string, formData: FormData) {
  await requireAdmin();
  let data: ReturnType<typeof parsePlayerForm>;
  try {
    data = parsePlayerForm(formData);
  } catch (e) {
    redirect(`/admin/joueurs/${playerId}?error=${flashCodeFromError(e)}`);
  }
  await updatePlayer(playerId, data);
  await storePlayerPhotoFromForm(formData, playerId);
  const riotInput = String(formData.get("riotId") ?? "").trim();
  if (riotInput) {
    try {
      const account = await resolveRiotAccount(riotInput, { excludePlayerId: playerId });
      await setPlayerRiotAccount(playerId, account);
    } catch (e) {
      redirect(`/admin/joueurs/${playerId}?error=${riotFlashCode(e)}`);
    }
  }
  revalidatePath(`/joueurs/${playerId}`);
  redirect(`/admin/joueurs/${playerId}?ok=player-saved`);
}

export async function deletePlayerAction(playerId: string) {
  await requireAdmin();
  await deletePlayer(playerId);
  // La photo est une donnée personnelle : elle doit disparaître du disque en
  // même temps que la fiche, pas seulement de la base (RGPD-01).
  await deleteStoredImage("players", playerId);
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
  const created = await createPlayerAndAddToRoster(teamId, data.pseudo, data.nationality, data.role);
  const riotInput = String(formData.get("riotId") ?? "").trim();
  if (riotInput) {
    try {
      const account = await resolveRiotAccount(riotInput);
      await setPlayerRiotAccount(created.id, account);
    } catch (e) {
      redirect(`/equipes/${teamId}/gestion/roster?error=${riotFlashCode(e)}`);
    }
  }
  revalidatePath(`/equipes/${teamId}/gestion/roster`);
  revalidatePath(`/equipes/${teamId}`);
  redirect(`/equipes/${teamId}/gestion/roster?ok=member-added`);
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
