import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser, getTeamManagerIds } from "@/lib/server-auth";
import { canManageTeam } from "@/lib/permissions";
import { getTeam } from "@/lib/data/teams";
import { toggleTeamLfpAction } from "@/app/equipes/actions";
import { VALORANT_ROLES, ROLE_LABELS } from "@/lib/roles";
import { LFP_MESSAGE_MAX } from "@/lib/lfp";
import TeamForm from "@/components/team-form";
import ConfirmDeleteButton from "@/components/confirm-delete-button";
import { updateTeamAction, deleteTeamAction } from "@/app/admin/actions/teams";

import { teamTitle } from "@/lib/data/titles";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const name = await teamTitle(id);
  return { title: name ? `Gestion · ${name}` : "Gestion de l'équipe" };
}

const TAB_LINK =
  "rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-medium text-white transition-colors duration-[130ms] hover:border-[var(--accent)] hover:bg-[var(--card-hover)] hover:text-[var(--accent)]";

export default async function TeamGestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const team = await getTeam(id);
  if (!team) notFound();

  const user = await getSessionUser();
  const managerIds = await getTeamManagerIds(id);
  if (!canManageTeam(user, managerIds)) redirect("/");

  const updateWithId = updateTeamAction.bind(null, id);
  const deleteWithId = deleteTeamAction.bind(null, id);
  const toggleLfpWithId = toggleTeamLfpAction.bind(null, id);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Gérer<span className="dot-sep">·</span>{team.name}</h1>
        <Link
          href={`/equipes/${id}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm text-white transition-colors duration-[130ms] hover:border-[var(--accent)] hover:bg-[var(--card-hover)] hover:text-[var(--accent)]"
        >
          Voir la page publique
        </Link>
      </div>

      <nav className="mb-8 flex flex-wrap gap-3">
        <Link href={`/equipes/${id}/gestion/roster`} className={TAB_LINK}>
          Roster
        </Link>
        <Link href={`/equipes/${id}/gestion/invitation`} className={TAB_LINK}>
          Lien d&apos;invitation
        </Link>
        <Link href={`/equipes/${id}/gestion/managers`} className={TAB_LINK}>
          Managers
        </Link>
      </nav>

      <h2 className="mb-3 text-lg font-semibold text-white">Identité</h2>
      <TeamForm
        action={updateWithId}
        submitLabel="Enregistrer"
        values={{
          name: team.name,
          tag: team.tag,
          region: team.region,
          description: team.description ?? undefined,
          status: team.status,
          socials: (team.socials ?? {}) as { twitter?: string; twitch?: string; website?: string },
        }}
      />

      <section className="mt-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="mb-1 text-lg font-semibold text-white">Recrutement</h2>
        <p className="mb-4 text-sm text-[var(--text-muted)]">
          {team.lfp
            ? "Ton équipe apparaît dans l'onglet Équipes de la page LFT / LFP."
            : "Publie une annonce pour apparaître dans l'onglet Équipes de la page LFT / LFP."}
        </p>

        <form action={toggleLfpWithId} className="grid gap-4">
          {/* Les champs ne servent qu'à l'allumage : éteindre efface l'annonce,
              inutile de renvoyer des postes qu'on s'apprête à effacer. */}
          {!team.lfp && (
            <>
              <fieldset className="grid gap-2">
                <legend className="text-sm text-[var(--text-muted)]">
                  Postes recherchés <span className="text-[var(--text-subtle)]">(aucun coché = ouvert à tous)</span>
                </legend>
                <div className="flex flex-wrap gap-3">
                  {VALORANT_ROLES.map((r) => (
                    <label key={r} className="flex items-center gap-1.5 text-sm text-white">
                      <input type="checkbox" name="lfpRole" value={r} className="accent-[var(--accent)]" />
                      {ROLE_LABELS[r]}
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className="grid gap-1 text-sm text-[var(--text-muted)]">
                Précisions (optionnel)
                <input
                  name="lfpMessage"
                  maxLength={LFP_MESSAGE_MAX}
                  placeholder="Niveau attendu, disponibilités, comment postuler…"
                  className="rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-white outline-none focus:border-[var(--accent)]"
                />
              </label>
            </>
          )}

          <button
            className={
              team.lfp
                ? "justify-self-start rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--accent)] transition-colors hover:border-[var(--accent)]"
                : "justify-self-start rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            }
          >
            {team.lfp ? "Retirer l'annonce" : "Publier l'annonce"}
          </button>
        </form>
      </section>

      <section className="mt-10 rounded-lg border border-[var(--destructive)] p-4">
        <h2 className="mb-2 text-lg font-semibold text-[var(--destructive)]">Zone danger</h2>
        <p className="mb-3 text-sm text-[var(--text-muted)]">
          La suppression de l&apos;équipe est définitive (roster, historiques et participations liées).
        </p>
        <ConfirmDeleteButton
          action={deleteWithId}
          label="Supprimer l'équipe"
          title="Supprimer l'équipe ?"
          message={`L'équipe « ${team.name} » sera supprimée définitivement. Roster, historiques et participations liés seront perdus.`}
        />
      </section>
    </main>
  );
}
