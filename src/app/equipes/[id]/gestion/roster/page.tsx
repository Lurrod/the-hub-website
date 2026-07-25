import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser, getTeamManagerIds } from "@/lib/server-auth";
import { canManageTeam } from "@/lib/permissions";
import { getTeam } from "@/lib/data/teams";
import { getTeamRoster } from "@/lib/data/players";
import { MEMBERSHIP_ROLES } from "@/lib/validation/player";
import {
  addRosterMemberAction,
  setMemberRoleAction,
  endMemberAction,
  removeMemberAction,
} from "@/app/admin/actions/players";

const ROLE_LABELS: Record<string, string> = {
  JOUEUR: "Joueur",
  SUB: "Remplaçant",
  COACH: "Coach",
  MANAGER: "Manager",
};

export default async function RosterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const team = await getTeam(id);
  if (!team) notFound();

  const user = await getSessionUser();
  const managerIds = await getTeamManagerIds(id);
  if (!canManageTeam(user, managerIds)) redirect("/");

  const roster = await getTeamRoster(id);
  const addWithId = addRosterMemberAction.bind(null, id);
  const input =
    "rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-white";

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-1 text-2xl font-bold text-white">Roster · {team.name}</h1>
      <Link href={`/equipes/${id}/gestion`} className="text-sm text-[var(--text-muted)]">
        ← Retour à la gestion
      </Link>

      <ul className="mt-6 divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
        {roster.length === 0 && <li className="p-3 text-[var(--text-muted)]">Roster vide.</li>}
        {roster.map((m) => {
          const setRole = setMemberRoleAction.bind(null, id, m.id);
          const endM = endMemberAction.bind(null, id, m.id);
          const removeM = removeMemberAction.bind(null, id, m.id);
          return (
            <li key={m.id} className="flex flex-wrap items-center gap-3 p-3">
              <Link href={`/joueurs/${m.playerId}`} className="font-medium text-white hover:text-[var(--accent)]">
                {m.player.pseudo}
              </Link>
              <span className="text-xs text-[var(--text-muted)]">{ROLE_LABELS[m.role]}</span>
              <div className="ml-auto flex items-center gap-2">
                <form action={setRole} className="flex items-center gap-1">
                  <select name="role" defaultValue={m.role} className={input}>
                    {MEMBERSHIP_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                  <button className="text-xs text-[var(--accent-2)]">Rôle</button>
                </form>
                <form action={endM}>
                  <button className="text-xs text-[var(--text-muted)]">Terminer</button>
                </form>
                <form action={removeM}>
                  <button className="text-xs text-[var(--accent)]">Retirer</button>
                </form>
              </div>
            </li>
          );
        })}
      </ul>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-white">Ajouter un joueur</h2>
        <form action={addWithId} className="grid max-w-md gap-3">
          <input name="pseudo" placeholder="Pseudo" required maxLength={40} className={input} />
          <input name="nationality" placeholder="Nationalité (optionnel)" className={input} />
          <select name="role" defaultValue="JOUEUR" className={input}>
            {MEMBERSHIP_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          <button className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white">
            Ajouter au roster
          </button>
        </form>
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          Crée un nouveau joueur et l'ajoute au roster. Les dates d'arrivée sont fixées à aujourd'hui
          (la saisie de dates historiques précises viendra en finition).
        </p>
      </section>
    </main>
  );
}
