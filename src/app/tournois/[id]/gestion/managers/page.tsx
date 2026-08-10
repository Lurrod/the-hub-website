import { notFound, redirect } from "next/navigation";
import { getSessionUser, getTournamentManagers } from "@/lib/server-auth";
import { canAdminister, canManageTournament, managerUserIds } from "@/lib/permissions";
import { getTournament } from "@/lib/data/tournaments";
import {
  addTournamentManagerAction,
  removeTournamentManagerAction,
  setTournamentManagerRoleAction,
} from "@/app/admin/actions/tournaments";
import ManagerList from "@/components/manager-list";
import type { ManagerRoleKey } from "@/lib/manager-roles";

import { tournamentTitle } from "@/lib/data/titles";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const name = await tournamentTitle(id);
  return { title: name ? `Managers · ${name}` : "Managers" };
}

export default async function TournamentManagersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  const managers = await getTournamentManagers(id);
  if (!canManageTournament(user, managerUserIds(managers))) redirect("/");
  const tournament = await getTournament(id);
  if (!tournament) notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-white">
        Managers<span className="dot-sep">·</span>
        {tournament.name}
      </h1>

      <ManagerList
        managers={tournament.managers.map((m) => ({
          id: m.id,
          userId: m.userId,
          role: m.role as ManagerRoleKey,
          label: m.user.name ?? m.user.discordId ?? m.userId,
        }))}
        canAdminister={canAdminister(user, managers)}
        setRoleAction={(userId) => setTournamentManagerRoleAction.bind(null, id, userId)}
        removeAction={(userId) => removeTournamentManagerAction.bind(null, id, userId)}
        addAction={addTournamentManagerAction.bind(null, id)}
      />
    </main>
  );
}
