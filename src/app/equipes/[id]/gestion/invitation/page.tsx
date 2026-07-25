import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser, getTeamManagerIds } from "@/lib/server-auth";
import { canManageTeam } from "@/lib/permissions";
import { getTeam } from "@/lib/data/teams";
import { isInviteValid } from "@/lib/invite";
import { generateInviteAction, revokeInviteAction } from "@/app/equipes/actions";

export default async function InvitationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const team = await getTeam(id);
  if (!team) notFound();

  const user = await getSessionUser();
  const managerIds = await getTeamManagerIds(id);
  if (!canManageTeam(user, managerIds)) redirect("/");

  const valid = isInviteValid(team, new Date());
  const generateWithId = generateInviteAction.bind(null, id);
  const revokeWithId = revokeInviteAction.bind(null, id);
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const link = valid ? `${base}/rejoindre/${team.inviteToken}` : null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Lien d&apos;invitation · {team.name}</h1>
        <Link
          href={`/equipes/${id}/gestion`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm text-white transition-colors duration-[130ms] hover:border-[var(--accent)] hover:bg-[var(--card-hover)] hover:text-[var(--accent)]"
        >
          ← Retour
        </Link>
      </div>

      {link ? (
        <div className="rounded-lg border border-[var(--border)] p-4">
          <p className="mb-2 text-sm text-[var(--text-muted)]">
            Lien actif (expire le {new Date(team.inviteExpiresAt!).toLocaleDateString("fr-FR")}) :
          </p>
          <code className="block break-all rounded bg-[var(--surface)] px-3 py-2 text-sm text-white">
            {link}
          </code>
          <div className="mt-4 flex gap-2">
            <form action={generateWithId}>
              <button className="rounded bg-[var(--card)] px-3 py-1.5 text-sm text-white">
                Régénérer
              </button>
            </form>
            <form action={revokeWithId}>
              <button className="rounded px-3 py-1.5 text-sm text-[var(--accent)]">Révoquer</button>
            </form>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-[var(--border)] p-4">
          <p className="mb-4 text-sm text-[var(--text-muted)]">
            Aucun lien actif. Génère un lien à partager (valable 7 jours, réutilisable).
          </p>
          <form action={generateWithId}>
            <button className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white">
              Générer un lien
            </button>
          </form>
        </div>
      )}
      <p className="mt-3 text-xs text-[var(--text-muted)]">
        Toute personne avec ce lien peut rejoindre l&apos;équipe tant qu&apos;il est valide. Révoque-le
        pour le désactiver immédiatement.
      </p>
    </main>
  );
}
