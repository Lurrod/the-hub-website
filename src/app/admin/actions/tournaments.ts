"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, assertCanManageTournament } from "@/lib/server-auth";
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
  removeTournamentManager,
} from "@/lib/data/tournaments";
import { validateImageUpload, processAndStoreImage } from "@/lib/images";

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
  };
  return tournamentInputSchema.parse(raw);
}

async function maybeStoreImage(
  formData: FormData,
  field: "logo" | "banner",
  tournamentId: string
): Promise<void> {
  const file = formData.get(field);
  if (!(file instanceof File) || file.size === 0) return;
  const check = validateImageUpload({ type: file.type, size: file.size });
  if (!check.ok) throw new Error(check.error);
  const buffer = Buffer.from(await file.arrayBuffer());
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
  redirect(`/admin/tournois/${t.id}`);
}

export async function updateTournamentAction(tournamentId: string, formData: FormData) {
  await assertCanManageTournament(tournamentId);
  const data = parseTournamentForm(formData);
  await updateTournament(tournamentId, data);
  await maybeStoreImage(formData, "logo", tournamentId);
  await maybeStoreImage(formData, "banner", tournamentId);
  revalidatePath("/tournois");
  revalidatePath(`/tournois/${tournamentId}`);
  revalidatePath(`/admin/tournois/${tournamentId}`);
}

export async function deleteTournamentAction(tournamentId: string) {
  await requireAdmin();
  await deleteTournament(tournamentId);
  revalidatePath("/tournois");
  revalidatePath("/admin/tournois");
  redirect("/admin/tournois");
}

export async function addParticipantAction(tournamentId: string, formData: FormData) {
  await assertCanManageTournament(tournamentId);
  const base = `/admin/tournois/${tournamentId}/inscrits`;
  const parsed = participantAddSchema.safeParse({
    teamId: formData.get("teamId"),
    seed: formData.get("seed") || undefined,
  });
  if (!parsed.success) redirect(`${base}?error=invalid`);
  const { teamId, seed } = parsed.data;
  if (seed != null) {
    const clash = await db.tournamentParticipant.findFirst({
      where: { tournamentId, seed, NOT: { teamId } },
      select: { id: true },
    });
    if (clash) redirect(`${base}?error=seedtaken`);
  }
  await addParticipant(tournamentId, teamId, seed);
  revalidatePath(base);
  revalidatePath(`/tournois/${tournamentId}`);
  redirect(base);
}

export async function removeParticipantAction(tournamentId: string, teamId: string) {
  await assertCanManageTournament(tournamentId);
  await removeParticipant(tournamentId, teamId);
  revalidatePath(`/admin/tournois/${tournamentId}/inscrits`);
  revalidatePath(`/tournois/${tournamentId}`);
}

export async function addTournamentManagerAction(tournamentId: string, formData: FormData) {
  await requireAdmin();
  const base = `/admin/tournois/${tournamentId}/managers`;
  const discordId = String(formData.get("discordId") ?? "").trim();
  if (!discordId) redirect(`${base}?error=empty`);
  const user = await db.user.findUnique({ where: { discordId }, select: { id: true } });
  if (!user) redirect(`${base}?error=notfound`);
  await addTournamentManager(tournamentId, user.id);
  revalidatePath(base);
  redirect(base);
}

export async function removeTournamentManagerAction(tournamentId: string, userId: string) {
  await requireAdmin();
  await removeTournamentManager(tournamentId, userId);
  revalidatePath(`/admin/tournois/${tournamentId}/managers`);
}
