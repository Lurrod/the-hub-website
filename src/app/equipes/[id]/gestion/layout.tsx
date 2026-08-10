import { redirect } from "next/navigation";
import { getSessionUser, getTeamManagerIds } from "@/lib/server-auth";
import { canManageTeam } from "@/lib/permissions";
import { NOINDEX } from "@/lib/metadata";

/** Toute la gestion est hors index : hérité par les sous-pages, qui ne
 *  définissent pas leur propre clé `robots`. */
export const metadata = NOINDEX;

/**
 * Garde partagée de toute la gestion d'équipe : admin OU manager de l'équipe.
 * Backstop pour éviter qu'une future sous-page oublie sa garde (les pages
 * conservent aussi leur propre vérification en défense-en-profondeur).
 */
export default async function TeamGestionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  const managerIds = await getTeamManagerIds(id);
  if (!canManageTeam(user, managerIds)) redirect("/");
  return <>{children}</>;
}
