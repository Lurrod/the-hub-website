import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-auth";
import { isAdmin } from "@/lib/permissions";
import TeamForm from "@/components/team-form";
import { createTeamAction } from "@/app/admin/actions/teams";

export default async function NewTeamPage() {
  const user = await getSessionUser();
  if (!isAdmin(user)) redirect("/");
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-white">Nouvelle équipe</h1>
      <TeamForm action={createTeamAction} submitLabel="Créer" />
    </main>
  );
}
