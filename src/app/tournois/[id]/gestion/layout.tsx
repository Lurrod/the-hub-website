import { redirect } from "next/navigation";
import { getSessionUser, getTournamentManagerIds } from "@/lib/server-auth";
import { canManageTournament } from "@/lib/permissions";

/**
 * Garde partagée de toute la gestion de tournoi : admin OU manager du tournoi.
 * Backstop pour éviter qu'une future sous-page oublie sa garde (les pages
 * conservent aussi leur propre vérification en défense-en-profondeur).
 */
export default async function TournamentGestionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  const managerIds = await getTournamentManagerIds(id);
  if (!canManageTournament(user, managerIds)) redirect("/");
  return <>{children}</>;
}
