import { EmptyLine } from "@/components/empty-state";
import {
  MANAGER_ROLES,
  MANAGER_ROLE_HINTS,
  MANAGER_ROLE_LABELS,
  type ManagerRoleKey,
} from "@/lib/manager-roles";

export type ManagerRow = {
  id: string;
  userId: string;
  role: ManagerRoleKey;
  label: string;
};

/**
 * Liste des managers d'une équipe ou d'un tournoi, partagée par les deux pages
 * de gestion : même modèle de droits des deux côtés, donc même écran.
 *
 * Les actions de promotion et de retrait ne s'affichent qu'aux propriétaires
 * (`canAdminister`) : un simple manager voit qui gère, sans pouvoir y toucher.
 */
export default function ManagerList({
  managers,
  canAdminister,
  setRoleAction,
  removeAction,
  addAction,
}: {
  managers: ManagerRow[];
  canAdminister: boolean;
  setRoleAction: (userId: string, role: ManagerRoleKey) => (formData: FormData) => void;
  removeAction: (userId: string) => () => void;
  addAction: (formData: FormData) => void;
}) {
  const input =
    "rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-white";
  const ownerCount = managers.filter((m) => m.role === "OWNER").length;

  return (
    <>
      <ul className="mb-6 divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
        {managers.length === 0 && (
          <li className="p-3">
            <EmptyLine>Aucun manager désigné.</EmptyLine>
          </li>
        )}
        {managers.map((m) => {
          const isOwner = m.role === "OWNER";
          // Le dernier propriétaire ne peut être ni rétrogradé ni retiré :
          // plus personne ne pourrait administrer la gestion. Le serveur le
          // refuse aussi, on évite juste de proposer un bouton qui échoue.
          const locked = isOwner && ownerCount === 1;
          const nextRole: ManagerRoleKey = isOwner ? "MANAGER" : "OWNER";
          return (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <span className="flex items-center gap-2">
                <span className="text-white">{m.label}</span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide ${
                    isOwner
                      ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "bg-[var(--card)] text-[var(--text-muted)]"
                  }`}
                  title={MANAGER_ROLE_HINTS[m.role]}
                >
                  {MANAGER_ROLE_LABELS[m.role]}
                </span>
              </span>
              {canAdminister && !locked && (
                <span className="flex items-center gap-3">
                  <form action={setRoleAction(m.userId, nextRole)}>
                    <input type="hidden" name="role" value={nextRole} />
                    <button className="text-sm text-[var(--text-muted)] transition-colors hover:text-white">
                      {isOwner ? "Rétrograder" : "Promouvoir propriétaire"}
                    </button>
                  </form>
                  <form action={removeAction(m.userId)}>
                    <button className="text-sm text-[var(--accent)]">Retirer</button>
                  </form>
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {canAdminister ? (
        <>
          <form action={addAction} className="flex flex-wrap gap-2">
            <input
              name="discordId"
              placeholder="ID Discord (ex. 123456789012345678)"
              aria-label="Identifiant Discord de la personne à ajouter"
              required
              className={`${input} min-w-56 flex-1`}
            />
            <select name="role" defaultValue="MANAGER" className={input} aria-label="Niveau">
              {MANAGER_ROLES.map((r) => (
                <option key={r} value={r}>
                  {MANAGER_ROLE_LABELS[r]}
                </option>
              ))}
            </select>
            <button className="rounded bg-[var(--accent)] px-3 py-2 text-sm font-medium">
              Ajouter
            </button>
          </form>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            L&apos;utilisateur doit s&apos;être déjà connecté au moins une fois (via Discord) pour
            exister en base. Utilise son ID Discord (Discord → Paramètres → Avancés → Mode
            développeur, puis clic droit sur le profil → «&nbsp;Copier l&apos;identifiant&nbsp;»).
          </p>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            <span className="text-white">{MANAGER_ROLE_LABELS.MANAGER}</span> —{" "}
            {MANAGER_ROLE_HINTS.MANAGER}
            <br />
            <span className="text-white">{MANAGER_ROLE_LABELS.OWNER}</span> —{" "}
            {MANAGER_ROLE_HINTS.OWNER}
          </p>
        </>
      ) : (
        <p className="text-xs text-[var(--text-muted)]">
          Seul un {MANAGER_ROLE_LABELS.OWNER.toLowerCase()} peut ajouter, promouvoir ou retirer un
          manager.
        </p>
      )}
    </>
  );
}
