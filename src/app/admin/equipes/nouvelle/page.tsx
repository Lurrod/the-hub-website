import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-auth";
import { isAdmin } from "@/lib/permissions";
import TeamForm from "@/components/team-form";
import { createTeamAction } from "@/app/admin/actions/teams";

export const metadata = { title: "Admin · Nouvelle équipe" };

export default async function NewTeamPage() {
  const user = await getSessionUser();
  if (!isAdmin(user)) redirect("/");
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-1 text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
        Nouvelle équipe
      </h1>
      <p className="mb-6 text-xs text-[var(--text-muted)]">
        Identité, réseaux et roster initial de l&apos;équipe.
      </p>
      <TeamForm action={createTeamAction} submitLabel="Créer l'équipe" allowRoster />
    </main>
  );
}
