"use server";

import { revalidatePath } from "next/cache";
import { assertCanManageTeam } from "@/lib/server-auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { generateTeamInvite, revokeTeamInvite, setTeamLfp } from "@/lib/data/teams";
import { nextLfpState } from "@/lib/lfp";

export async function generateInviteAction(teamId: string) {
  await assertCanManageTeam(teamId);
  await generateTeamInvite(teamId);
  revalidatePath(`/equipes/${teamId}/gestion`);
}

export async function revokeInviteAction(teamId: string) {
  await assertCanManageTeam(teamId);
  await revokeTeamInvite(teamId);
  revalidatePath(`/equipes/${teamId}/gestion`);
}

/**
 * Bascule l'annonce de recrutement de l'équipe.
 *
 * Pendant du `toggleMyLftAction` du profil : c'est le manager qui décide pour
 * l'équipe, là où le joueur décide pour lui-même.
 */
export async function toggleTeamLfpAction(teamId: string, formData: FormData) {
  await assertCanManageTeam(teamId);
  const team = await db.team.findUnique({ where: { id: teamId }, select: { lfp: true } });
  if (!team) redirect("/equipes");

  const state = nextLfpState(team.lfp, {
    roles: formData.getAll("lfpRole").map(String),
    message: String(formData.get("lfpMessage") ?? ""),
  });
  await setTeamLfp(teamId, state);

  revalidatePath(`/equipes/${teamId}/gestion`);
  revalidatePath(`/equipes/${teamId}`);
  revalidatePath("/lft");
  redirect(`/equipes/${teamId}/gestion?ok=${state.lfp ? "lfp-on" : "lfp-off"}`);
}
