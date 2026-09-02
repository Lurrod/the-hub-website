"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertCanManageTeam } from "@/lib/server-auth";
import { countActiveRosterPlayers } from "@/lib/data/teams";
import {
  getTournamentRegistrationInfo,
  isTeamRegistered,
  registerTeamIfRoom,
} from "@/lib/data/tournaments";
import { MIN_ROSTER_FOR_TOURNAMENT } from "@/lib/constants";
import { isRegistrationOpen } from "@/lib/tournament-status";

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

  const tournament = await getTournamentRegistrationInfo(tournamentId);
  if (!tournament) redirect(`${base}?error=invalid`);
  // La règle porte sur les dates, pas seulement sur le statut : un tournoi dont
  // personne n'a basculé le statut à la main restait ouvert aux inscriptions
  // pendant toute sa durée.
  if (!isRegistrationOpen(tournament)) redirect(`${base}?error=notupcoming`);

  if (await isTeamRegistered(tournamentId, teamId)) {
    redirect(`${base}?error=alreadyregistered`);
  }

  if ((await countActiveRosterPlayers(teamId)) < MIN_ROSTER_FOR_TOURNAMENT) {
    redirect(`${base}?error=rosterincomplete`);
  }

  // Le comptage et l'insertion sont dans la même transaction, côté données :
  // sans ça, deux inscriptions simultanées pourraient toutes deux passer la
  // limite.
  if (!(await registerTeamIfRoom(tournamentId, teamId, tournament.maxTeams))) {
    redirect(`${base}?error=tournamentfull`);
  }

  revalidatePath(base);
  revalidatePath("/tournois");
  redirect(`${base}?ok=team-registered`);
}
