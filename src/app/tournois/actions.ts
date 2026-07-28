"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assertCanManageTeam } from "@/lib/server-auth";
import { countActiveRosterPlayers } from "@/lib/data/teams";
import { MIN_ROSTER_FOR_TOURNAMENT } from "@/lib/constants";

/** Levée dans la transaction quand la limite d'équipes est atteinte. */
const FULL = "TOURNAMENT_FULL";

/**
 * Inscription d'une équipe à un tournoi par son manager.
 *
 * Conditions : le tournoi est en phase « À venir », sa limite d'équipes
 * (`maxTeams`) n'est pas atteinte, et le roster compte au moins
 * MIN_ROSTER_FOR_TOURNAMENT joueurs actifs hors staff.
 */
export async function registerTeamAction(tournamentId: string, formData: FormData) {
  const base = `/tournois/${tournamentId}`;
  const teamId = String(formData.get("teamId") ?? "");
  if (!teamId) redirect(`${base}?error=invalid`);

  // Seul un manager de CETTE équipe (ou un admin) peut l'inscrire.
  await assertCanManageTeam(teamId);

  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
    select: { status: true, maxTeams: true },
  });
  if (!tournament) redirect(`${base}?error=invalid`);
  if (tournament.status !== "UPCOMING") redirect(`${base}?error=notupcoming`);

  const existing = await db.tournamentParticipant.findUnique({
    where: { tournamentId_teamId: { tournamentId, teamId } },
    select: { id: true },
  });
  if (existing) redirect(`${base}?error=alreadyregistered`);

  if ((await countActiveRosterPlayers(teamId)) < MIN_ROSTER_FOR_TOURNAMENT) {
    redirect(`${base}?error=rosterincomplete`);
  }

  // Le comptage et l'insertion sont dans la même transaction : sans ça, deux
  // inscriptions simultanées pourraient toutes deux passer la limite.
  let isFull = false;
  try {
    await db.$transaction(async (tx) => {
      const count = await tx.tournamentParticipant.count({ where: { tournamentId } });
      if (tournament.maxTeams != null && count >= tournament.maxTeams) throw new Error(FULL);
      await tx.tournamentParticipant.create({ data: { tournamentId, teamId } });
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === FULL) isFull = true;
    else throw error;
  }
  if (isFull) redirect(`${base}?error=tournamentfull`);

  revalidatePath(base);
  revalidatePath("/tournois");
  redirect(`${base}?ok=team-registered`);
}
