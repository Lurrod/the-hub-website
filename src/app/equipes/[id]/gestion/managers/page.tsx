import { notFound, redirect } from "next/navigation";
import { getSessionUser, getTeamManagers } from "@/lib/server-auth";
import { canAdminister, canManageTeam, managerUserIds } from "@/lib/permissions";
import { getTeam } from "@/lib/data/teams";
import {
  addManagerAction,
  removeManagerAction,
  setManagerRoleAction,
} from "@/app/admin/actions/teams";
import ManagerList from "@/components/manager-list";
import type { ManagerRoleKey } from "@/lib/manager-roles";

import { teamTitle } from "@/lib/data/titles";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const name = await teamTitle(id);
  return { title: name ? `Managers · ${name}` : "Managers" };
}

export default async function TeamManagersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  const managers = await getTeamManagers(id);
  if (!canManageTeam(user, managerUserIds(managers))) redirect("/");
  const team = await getTeam(id);
  if (!team) notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-white">
        Managers<span className="dot-sep">·</span>
        {team.name}
      </h1>

      <ManagerList
        managers={team.managers.map((m) => ({
          id: m.id,
          userId: m.userId,
          role: m.role as ManagerRoleKey,
          label: m.user.name ?? m.user.discordId ?? m.userId,
        }))}
        canAdminister={canAdminister(user, managers)}
        setRoleAction={(userId) => setManagerRoleAction.bind(null, id, userId)}
        removeAction={(userId) => removeManagerAction.bind(null, id, userId)}
        addAction={addManagerAction.bind(null, id)}
      />
    </main>
  );
}
