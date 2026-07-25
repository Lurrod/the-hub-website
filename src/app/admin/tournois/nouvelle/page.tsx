import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-auth";
import { isAdmin } from "@/lib/permissions";
import TournamentForm from "@/components/tournament-form";
import { createTournamentAction } from "@/app/admin/actions/tournaments";

export default async function NewTournamentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getSessionUser();
  if (!isAdmin(user)) redirect("/");
  const { error } = await searchParams;
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-white">Nouveau tournoi</h1>
      {error && (
        <p className="mb-4 rounded border border-[var(--destructive)] bg-[var(--destructive-soft)] px-3 py-2 text-sm text-[var(--destructive)]">
          Données invalides : vérifie les champs obligatoires du formulaire.
        </p>
      )}
      <TournamentForm action={createTournamentAction} submitLabel="Créer" />
    </main>
  );
}
