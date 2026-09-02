import { registerTeamAction } from "@/app/tournois/actions";
import { MIN_ROSTER_FOR_TOURNAMENT } from "@/lib/constants";

export type RegistrableTeam = {
  id: string;
  name: string;
  /** Joueurs actifs hors staff. */
  players: number;
  registered: boolean;
};

/**
 * Encart d'inscription affiché sur la fiche tournoi aux managers d'équipe.
 * Ne s'affiche que si l'utilisateur gère au moins une équipe.
 */
export default function TournamentRegister({
  tournamentId,
  open,
  teams,
  teamCount,
  maxTeams,
}: {
  tournamentId: string;
  /** Calculé par `isRegistrationOpen` : dates ET statut, pas le statut seul. */
  open: boolean;
  teams: RegistrableTeam[];
  teamCount: number;
  maxTeams: number | null;
}) {
  if (teams.length === 0) return null;

  const box =
    "rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--text-muted)]";

  if (!open) {
    return <p className={box}>Les inscriptions sont fermées : le tournoi a déjà commencé.</p>;
  }

  const isFull = maxTeams != null && teamCount >= maxTeams;
  if (isFull) {
    return (
      <p className={box}>
        Tournoi complet<span className="dot-sep">·</span>
        <span className="stat">
          {teamCount}/{maxTeams}
        </span>{" "}
        équipes inscrites.
      </p>
    );
  }

  const eligible = teams.filter((t) => !t.registered && t.players >= MIN_ROSTER_FOR_TOURNAMENT);
  const alreadyIn = teams.filter((t) => t.registered);
  const tooSmall = teams.filter((t) => !t.registered && t.players < MIN_ROSTER_FOR_TOURNAMENT);

  const action = registerTeamAction.bind(null, tournamentId);
  const input =
    "rounded border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-white";

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h3 className="text-sm font-semibold text-white">Inscrire mon équipe</h3>
        {maxTeams != null && (
          <span className="stat text-xs text-[var(--text-muted)]">
            {teamCount}/{maxTeams} places
          </span>
        )}
      </div>

      {eligible.length > 0 ? (
        <form action={action} className="flex flex-wrap items-center gap-2">
          {eligible.length > 1 ? (
            <select name="teamId" required className={`${input} min-w-48 flex-1`}>
              {eligible.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          ) : (
            <input type="hidden" name="teamId" value={eligible[0].id} />
          )}
          <button className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-semibold">
            {eligible.length > 1 ? "Inscrire" : `Inscrire ${eligible[0].name}`}
          </button>
        </form>
      ) : (
        <p className="text-sm text-[var(--text-muted)]">
          Aucune de tes équipes ne peut s&apos;inscrire pour le moment.
        </p>
      )}

      {alreadyIn.length > 0 && (
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          Déjà inscrite<span className="dot-sep">·</span>
          {alreadyIn.map((t) => t.name).join(", ")}
        </p>
      )}

      {tooSmall.length > 0 && (
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          Effectif incomplet<span className="dot-sep">·</span>
          {tooSmall
            .map((t) => `${t.name} (${t.players}/${MIN_ROSTER_FOR_TOURNAMENT} joueurs)`)
            .join(", ")}
        </p>
      )}
    </div>
  );
}
