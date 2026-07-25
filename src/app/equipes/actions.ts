"use server";

import { revalidatePath } from "next/cache";
import { assertCanManageTeam } from "@/lib/server-auth";
import { generateTeamInvite, revokeTeamInvite } from "@/lib/data/teams";

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
