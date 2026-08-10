"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  requireAdmin,
  assertCanManageTournament,
  assertCanAdministerTournament,
} from "@/lib/server-auth";
import { parseManagerRole } from "@/lib/manager-roles";
import { db } from "@/lib/db";
import { tournamentInputSchema, participantAddSchema } from "@/lib/validation/tournament";
import {
  createTournament,
  updateTournament,
  deleteTournament,
  setTournamentLogo,
  setTournamentBanner,
  addParticipant,
  removeParticipant,
  addTournamentManager,
  removeTournamentManagerIfNotLast,
  setTournamentManagerRole,
} from "@/lib/data/tournaments";
import { readUploadedImage, processAndStoreImage } from "@/lib/images";

function parseTournamentForm(formData: FormData) {
  const raw = {
    name: formData.get("name"),
    region: formData.get("region"),
    format: formData.get("format"),
    status: formData.get("status") || "UPCOMING",
    startDate: formData.get("startDate") || undefined,
    endDate: formData.get("endDate") || undefined,
    prizePool: formData.get("prizePool") || undefined,
    organizer: formData.get("organizer") || undefined,
    description: formData.get("description") || undefined,
    maxTeams: formData.get("maxTeams") || undefined,
    groupSize: formData.get("groupSize") || undefined,
    bestOf: formData.get("bestOf") || undefined,
    seeding: formData.get("seeding") || undefined,
    socials: {
      twitter: formData.get("twitter") || undefined,
      twitch: formData.get("twitch") || undefined,
      youtube: formData.get("youtube") || undefined,
      instagram: formData.get("instagram") || undefined,
      discord: formData.get("discord") || undefined,
      website: formData.get("website") || undefined,
    },
  };
  return tournamentInputSchema.parse(raw);
}

async function maybeStoreImage(
  formData: FormData,
  field: "logo" | "banner",
  tournamentId: string
): Promise<void> {
  const buffer = await readUploadedImage(formData.get(field));
  if (!buffer) return;
  if (field === "banner") {
    const key = await processAndStoreImage(buffer, "tournaments", tournamentId, "banner");
    await setTournamentBanner(tournamentId, key);
  } else {
    const key = await processAndStoreImage(buffer, "tournaments", tournamentId);
    await setTournamentLogo(tournamentId, key);
  }
}

export async function createTournamentAction(formData: FormData) {
  const admin = await requireAdmin();
  let data: ReturnType<typeof parseTournamentForm>;
  try {
    data = parseTournamentForm(formData);
  } catch {
    redirect("/admin/tournois/nouvelle?error=invalid");
  }
  const t = await createTournament(data, admin.id);
  await maybeStoreImage(formData, "logo", t.id);
  await maybeStoreImage(formData, "banner", t.id);
  revalidatePath("/tournois");
  revalidatePath("/admin/tournois");
  redirect(`/tournois/${t.id}/gestion?ok=tournament-created`);
}

export async function updateTournamentAction(tournamentId: string, formData: FormData) {
  await assertCanManageTournament(tournamentId);
  let data: ReturnType<typeof parseTournamentForm>;
  try {
    data = parseTournamentForm(formData);
  } catch {
    redirect(`/tournois/${tournamentId}/gestion?error=invalid`);
  }
  await updateTournament(tournamentId, data);
  await maybeStoreImage(formData, "logo", tournamentId);
  await maybeStoreImage(formData, "banner", tournamentId);
  revalidatePath("/tournois");
  revalidatePath(`/tournois/${tournamentId}`);
  revalidatePath(`/tournois/${tournamentId}/gestion`);
  redirect(`/tournois/${tournamentId}/gestion?ok=tournament-saved`);
}

export async function deleteTournamentAction(tournamentId: string) {
  // Supprimer le tournoi efface en cascade poules, participants et matchs :
  // réservé au propriétaire.
  await assertCanAdministerTournament(tournamentId);
  await deleteTournament(tournamentId);
  revalidatePath("/tournois");
  revalidatePath("/admin/tournois");
  redirect("/tournois?ok=tournament-deleted");
}

export async function addParticipantAction(tournamentId: string, formData: FormData) {
  await assertCanManageTournament(tournamentId);
  const base = `/tournois/${tournamentId}/gestion/inscrits`;
  const parsed = participantAddSchema.safeParse({
    teamId: formData.get("teamId"),
    seed: formData.get("seed") || undefined,
  });
  if (!parsed.success) redirect(`${base}?error=invalid`);
  const { teamId, seed } = parsed.data;
  // Le contrôle du seed vit dans la transaction d'insertion : le faire ici
  // laissait deux ajouts simultanés passer tous les deux.
  if (!(await addParticipant(tournamentId, teamId, seed))) {
    redirect(`${base}?error=seedtaken`);
  }
  revalidatePath(base);
  revalidatePath(`/tournois/${tournamentId}`);
  redirect(`${base}?ok=participant-added`);
}

export async function removeParticipantAction(tournamentId: string, teamId: string) {
  await assertCanManageTournament(tournamentId);
  await removeParticipant(tournamentId, teamId);
  revalidatePath(`/tournois/${tournamentId}/gestion/inscrits`);
  revalidatePath(`/tournois/${tournamentId}`);
}

/** Administrer les managers, c'est distribuer les droits : réservé au propriétaire. */
export async function addTournamentManagerAction(tournamentId: string, formData: FormData) {
  await assertCanAdministerTournament(tournamentId);
  const base = `/tournois/${tournamentId}/gestion/managers`;
  const discordId = String(formData.get("discordId") ?? "").trim();
  if (!discordId) redirect(`${base}?error=empty`);
  const user = await db.user.findUnique({ where: { discordId }, select: { id: true } });
  if (!user) redirect(`${base}?error=notfound`);
  await addTournamentManager(tournamentId, user.id, parseManagerRole(formData.get("role")));
  revalidatePath(base);
  redirect(`${base}?ok=manager-added`);
}

export async function removeTournamentManagerAction(tournamentId: string, userId: string) {
  await assertCanAdministerTournament(tournamentId);
  const base = `/tournois/${tournamentId}/gestion/managers`;
  const removed = await removeTournamentManagerIfNotLast(tournamentId, userId);
  if (!removed) redirect(`${base}?error=lastowner`);
  revalidatePath(base);
}

export async function setTournamentManagerRoleAction(
  tournamentId: string,
  userId: string,
  formData: FormData
) {
  await assertCanAdministerTournament(tournamentId);
  const base = `/tournois/${tournamentId}/gestion/managers`;
  const changed = await setTournamentManagerRole(
    tournamentId,
    userId,
    parseManagerRole(formData.get("role"))
  );
  if (!changed) redirect(`${base}?error=lastowner`);
  revalidatePath(base);
  redirect(`${base}?ok=manager-role`);
}
