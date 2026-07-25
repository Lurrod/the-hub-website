import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser, getTournamentManagerIds } from "@/lib/server-auth";
import { canManageTournament } from "@/lib/permissions";
import { getTournament } from "@/lib/data/tournaments";
import { getGroupsWithMatches, listTournamentMatches } from "@/lib/data/matches";
import { STAGES_BY_FORMAT, formatAllowsGroups } from "@/lib/constants";
import MatchForm from "@/components/match-form";
import {
  createGroupAction,
  deleteGroupAction,
  assignParticipantGroupAction,
  createMatchAction,
  deleteMatchAction,
} from "@/app/admin/actions/matches";

export default async function CompetitionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const tournament = await getTournament(id);
  if (!tournament) notFound();

  const user = await getSessionUser();
  const managerIds = await getTournamentManagerIds(id);
  if (!canManageTournament(user, managerIds)) redirect("/");

  const [groups, matches] = await Promise.all([
    getGroupsWithMatches(id),
    listTournamentMatches(id),
  ]);

  const allowGroups = formatAllowsGroups(tournament.format);
  const allowedStages = STAGES_BY_FORMAT[tournament.format];

  const teams = tournament.participants.map((p) => ({ id: p.teamId, name: p.team.name }));
  const groupOptions = groups.map((g) => ({ id: g.id, name: g.name }));

  const createGroupWith = createGroupAction.bind(null, id);
  const createMatchWith = createMatchAction.bind(null, id);
  const input =
    "rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-white";

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-white">Compétition · {tournament.name}</h1>

      {error && (
        <p className="mb-6 rounded border border-[var(--destructive)] bg-[var(--destructive-soft)] px-3 py-2 text-sm text-[var(--destructive)]">
          {error === "stage"
            ? "Cette phase n'est pas autorisée par le format du tournoi."
            : error === "nogroups"
              ? "Ce format de tournoi ne comporte pas de poules."
              : "Données invalides : vérifie les champs du formulaire."}
        </p>
      )}

      {allowGroups && (
        <>
          <section className="mb-10">
            <h2 className="mb-3 text-lg font-semibold text-white">Poules</h2>
            <ul className="mb-3 divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
              {groups.length === 0 && <li className="p-3 text-[var(--text-muted)]">Aucune poule.</li>}
              {groups.map((g) => {
                const deleteGroupWith = deleteGroupAction.bind(null, id, g.id);
                return (
                  <li key={g.id} className="flex items-center justify-between p-3">
                    <span className="text-white">{g.name}</span>
                    <form action={deleteGroupWith}>
                      <button className="text-sm text-[var(--accent)]">Supprimer</button>
                    </form>
                  </li>
                );
              })}
            </ul>
            <form action={createGroupWith} className="flex gap-2">
              <input name="name" placeholder="Nom de la poule (ex. Groupe A)" required className={`${input} flex-1`} />
              <button className="rounded bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white">
                Ajouter
              </button>
            </form>
          </section>

          <section className="mb-10">
            <h2 className="mb-3 text-lg font-semibold text-white">Affectation des équipes aux poules</h2>
            <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
              {tournament.participants.length === 0 && (
                <li className="p-3 text-[var(--text-muted)]">Aucune équipe inscrite.</li>
              )}
              {tournament.participants.map((p) => {
                const assignWith = assignParticipantGroupAction.bind(null, id, p.teamId);
                return (
                  <li key={p.id} className="flex items-center justify-between gap-3 p-3">
                    <span className="text-white">{p.team.name}</span>
                    <form action={assignWith} className="flex gap-2">
                      <select name="groupId" defaultValue={p.groupId ?? ""} className={input}>
                        <option value="">— Sans poule —</option>
                        {groupOptions.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                      <button className="rounded bg-[var(--card)] px-3 py-2 text-sm text-white">OK</button>
                    </form>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold text-white">Matchs</h2>
        <ul className="mb-4 divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
          {matches.length === 0 && <li className="p-3 text-[var(--text-muted)]">Aucun match.</li>}
          {matches.map((m) => {
            const deleteMatchWith = deleteMatchAction.bind(null, id, m.id);
            return (
              <li key={m.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <span className="text-white">
                  {m.teamA.name} {m.scoreA}–{m.scoreB} {m.teamB.name}
                  <span className="ml-2 text-[var(--text-muted)]">
                    {m.stage === "BRACKET" ? m.round ?? "Playoffs" : m.group?.name ?? "Poule"}
                  </span>
                </span>
                <span className="flex shrink-0 gap-3">
                  <Link href={`/tournois/${id}/gestion/matchs/${m.id}`} className="text-[var(--accent)]">
                    Éditer
                  </Link>
                  <form action={deleteMatchWith}>
                    <button className="text-[var(--accent)]">Suppr.</button>
                  </form>
                </span>
              </li>
            );
          })}
        </ul>
        <h3 className="mb-2 text-sm font-semibold text-white">Nouveau match</h3>
        <MatchForm
          action={createMatchWith}
          teams={teams}
          groups={groupOptions}
          stages={allowedStages}
          submitLabel="Créer le match"
        />
      </section>
    </main>
  );
}
