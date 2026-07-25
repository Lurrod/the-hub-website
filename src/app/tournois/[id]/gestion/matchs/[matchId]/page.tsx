import { notFound, redirect } from "next/navigation";
import { getSessionUser, getTournamentManagerIds } from "@/lib/server-auth";
import { canManageTournament } from "@/lib/permissions";
import { getTournament } from "@/lib/data/tournaments";
import { getMatch, getGroupsWithMatches } from "@/lib/data/matches";
import MatchForm from "@/components/match-form";
import { VALORANT_MAPS, STAGES_BY_FORMAT } from "@/lib/constants";
import {
  updateMatchAction,
  addMatchMapAction,
  removeMatchMapAction,
} from "@/app/admin/actions/matches";

function toDateInput(d: Date | null): string {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}

export default async function EditMatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; matchId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id, matchId } = await params;
  const { error } = await searchParams;

  const tournament = await getTournament(id);
  if (!tournament) notFound();

  const user = await getSessionUser();
  const managerIds = await getTournamentManagerIds(id);
  if (!canManageTournament(user, managerIds)) redirect("/");

  const match = await getMatch(matchId);
  if (!match || match.tournamentId !== id) notFound();

  const groups = await getGroupsWithMatches(id);
  const teams = tournament.participants.map((p) => ({ id: p.teamId, name: p.team.name }));
  const groupOptions = groups.map((g) => ({ id: g.id, name: g.name }));
  const allowedStages = STAGES_BY_FORMAT[tournament.format];

  const updateWith = updateMatchAction.bind(null, id, matchId);
  const addMapWith = addMatchMapAction.bind(null, id, matchId);
  const input =
    "rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-white";

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-white">
        Éditer le match — {match.teamA.name} vs {match.teamB.name}
      </h1>

      {error && (
        <p className="mb-4 rounded border border-[var(--destructive)] bg-[var(--destructive-soft)] px-3 py-2 text-sm text-[var(--destructive)]">
          {error === "stage"
            ? "Cette phase n'est pas autorisée par le format du tournoi."
            : "Données invalides : vérifie les champs du formulaire."}
        </p>
      )}

      <MatchForm
        action={updateWith}
        teams={teams}
        groups={groupOptions}
        stages={allowedStages}
        submitLabel="Enregistrer"
        values={{
          teamAId: match.teamAId,
          teamBId: match.teamBId,
          scoreA: match.scoreA,
          scoreB: match.scoreB,
          stage: match.stage,
          status: match.status,
          bestOf: match.bestOf,
          groupId: match.groupId ?? undefined,
          round: match.round ?? undefined,
          bracketPosition: match.bracketPosition ?? undefined,
          date: toDateInput(match.date),
          vodUrl: match.vodUrl ?? undefined,
        }}
      />

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold text-white">Détail des maps</h2>
        <ul className="mb-4 divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
          {match.maps.length === 0 && (
            <li className="p-3 text-[var(--text-muted)]">Aucune map saisie.</li>
          )}
          {match.maps.map((m) => {
            const removeWith = removeMatchMapAction.bind(null, id, matchId, m.id);
            return (
              <li key={m.id} className="flex items-center justify-between p-3 text-sm">
                <span className="text-white">
                  {m.mapName} · {m.scoreA}–{m.scoreB}
                </span>
                <form action={removeWith}>
                  <button className="text-[var(--accent)]">Retirer</button>
                </form>
              </li>
            );
          })}
        </ul>

        <form action={addMapWith} className="flex flex-wrap items-end gap-2">
          <input
            name="mapName"
            list="valorant-maps"
            placeholder="Map"
            required
            className={`${input} flex-1`}
          />
          <datalist id="valorant-maps">
            {VALORANT_MAPS.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          <input name="scoreA" type="number" min="0" placeholder="A" className={`${input} w-20`} />
          <input name="scoreB" type="number" min="0" placeholder="B" className={`${input} w-20`} />
          <input name="order" type="number" min="0" placeholder="#" className={`${input} w-16`} />
          <button className="rounded bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white">
            Ajouter la map
          </button>
        </form>
      </section>
    </main>
  );
}
