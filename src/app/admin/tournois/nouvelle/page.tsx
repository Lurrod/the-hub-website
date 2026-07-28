import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-auth";
import { isAdmin } from "@/lib/permissions";
import TournamentForm from "@/components/tournament-form";
import { createTournamentAction } from "@/app/admin/actions/tournaments";

export const metadata = { title: "Admin · Nouveau tournoi" };

export default async function NewTournamentPage() {
  const user = await getSessionUser();
  if (!isAdmin(user)) redirect("/");
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-1 text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
        Nouveau tournoi
      </h1>
      <p className="mb-6 text-xs text-[var(--text-muted)]">
        Configure le format, la compétition et les visuels.
      </p>
      <TournamentForm action={createTournamentAction} submitLabel="Créer le tournoi" />
    </main>
  );
}
