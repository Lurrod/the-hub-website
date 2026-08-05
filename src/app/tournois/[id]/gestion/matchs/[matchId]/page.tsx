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
  importMatchMapAction,
  removeMatchMapAction,
  refetchMatchStatsAction,
} from "@/app/admin/actions/matches";
import ConfirmDeleteButton from "@/components/confirm-delete-button";
import { hasRiotStats } from "@/lib/match-stats-core";

import { tournamentTitle } from "@/lib/data/titles";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; matchId: string }>;
}) {
  const { id } = await params;
  const name = await tournamentTitle(id);
  return { title: name ? `Éditer un match · ${name}` : "Éditer un match" };
}

function toDateInput(d: Date | null): string {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}

export default async function EditMatchPage({
  params,
}: {
  params: Promise<{ id: string; matchId: string }>;
}) {
  const { id, matchId } = await params;

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
  const importMapWith = importMatchMapAction.bind(null, id, matchId);
  const refetchWith = refetchMatchStatsAction.bind(null, id, matchId);
  const input =
    "rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-white";

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-white">
        Éditer le match - {match.teamA.name} vs {match.teamB.name}
      </h1>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        {hasRiotStats(match.statsStatus) ? (
          <p className="text-xs text-[var(--success)]">
            Stats récupérées depuis Riot
            {match.statsStatus === "MANUAL" ? " (import manuel)" : " (recherche automatique)"}
            {match.statsFetchedAt
              ? ` le ${new Date(match.statsFetchedAt).toLocaleString("fr-FR")}`
              : ""}
            .
          </p>
        ) : match.statsStatus === "NOT_FOUND" ? (
          <p className="text-xs text-[var(--text-muted)]">
            Aucune partie custom correspondante trouvée. Relance la recherche une fois la partie
            disponible dans l&apos;historique Riot, ou importe-la plus bas par son identifiant.
          </p>
        ) : null}

        {/* La recherche automatique remplace TOUTES les maps du match : elle ne
            part plus toute seule à chaque enregistrement, mais reste
            déclenchable ici, après confirmation. */}
        <ConfirmDeleteButton
          action={refetchWith}
          label="Relancer la recherche Riot"
          title="Relancer la recherche automatique ?"
          message={
            match.maps.length > 0
              ? `Les ${match.maps.length} map(s) actuelles de ce match, imports manuels compris, seront remplacées par celles trouvées dans l'historique Riot.`
              : "Les maps trouvées dans l'historique Riot seront rattachées à ce match."
          }
          confirmLabel="Relancer"
          pendingLabel="Recherche…"
        />
      </div>

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
        <h2 className="mb-1 text-lg font-semibold text-white">Détail des maps</h2>
        <p className="mb-3 text-xs text-[var(--text-muted)]">
          Ajouter ou retirer une map recalcule le score du match : une map gagnée vaut un point.
        </p>
        <ul className="mb-4 divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
          {match.maps.length === 0 && (
            <li className="p-3 text-[var(--text-muted)]">Aucune map saisie.</li>
          )}
          {match.maps.map((m) => {
            const removeWith = removeMatchMapAction.bind(null, id, matchId, m.id);
            return (
              <li key={m.id} className="flex items-center justify-between p-3 text-sm">
                <span className="text-white">
                  {m.mapName}
                  <span className="dot-sep">·</span>
                  {m.scoreA}-{m.scoreB}
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

      <section className="mt-10">
        <h2 className="mb-1 text-lg font-semibold text-white">Importer une map depuis Riot</h2>
        <p className="mb-3 text-xs text-[var(--text-muted)]">
          À utiliser quand la recherche automatique ne trouve pas la partie. L&apos;identifiant se
          lit dans l&apos;URL de la partie sur un site de tracking, ou dans l&apos;historique Riot.
          La map s&apos;ajoute à la suite des autres et le score du match est recalculé.
        </p>

        <form action={importMapWith} className="flex flex-wrap items-end gap-2">
          <input
            name="riotMatchId"
            placeholder="00000000-0000-0000-0000-000000000000"
            required
            className={`${input} min-w-72 flex-1 font-mono`}
          />
          <select name="campOfTeamA" defaultValue="AUTO" className={input} aria-label="Camp Riot de l'équipe A">
            <option value="AUTO">Déduire le camp</option>
            <option value="Blue">{match.teamA.name} était Blue</option>
            <option value="Red">{match.teamA.name} était Red</option>
          </select>
          <button className="rounded bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white">
            Importer
          </button>
        </form>
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          « Déduire le camp » se base sur les joueurs dont le Riot ID est lié. Sans joueur lié,
          choisis le camp à la main, sinon les deux équipes risquent d&apos;être inversées.
        </p>
      </section>
    </main>
  );
}
