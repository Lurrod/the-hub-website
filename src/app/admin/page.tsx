import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-auth";
import { isAdmin } from "@/lib/permissions";
import { db } from "@/lib/db";
import { getAudienceSummary } from "@/lib/data/audience";
import AdminAudience from "@/components/admin-audience";

export const metadata = { title: "Administration" };

/** Fenêtre de la zone de fréquentation. */
const AUDIENCE_DAYS = 30;

type AdminSection = {
  href: string;
  label: string;
  count: number;
  description: string;
  createHref?: string;
  createLabel?: string;
};

export default async function AdminDashboardPage() {
  const user = await getSessionUser();
  if (!isAdmin(user)) redirect("/");

  const [teams, players, tournaments, matches, audience] = await Promise.all([
    db.team.count(),
    db.player.count(),
    db.tournament.count(),
    db.match.count(),
    getAudienceSummary(AUDIENCE_DAYS),
  ]);

  const sections: AdminSection[] = [
    {
      href: "/admin/tournois",
      label: "Tournois",
      count: tournaments,
      description: "Compétitions, poules, brackets et matchs.",
      createHref: "/admin/tournois/nouvelle",
      createLabel: "Nouveau tournoi",
    },
    {
      href: "/admin/equipes",
      label: "Équipes",
      count: teams,
      description: "Fiches d'équipes, logos, managers et rosters.",
      createHref: "/admin/equipes/nouvelle",
      createLabel: "Nouvelle équipe",
    },
    {
      href: "/admin/joueurs",
      label: "Joueurs",
      count: players,
      description: "Fiches de joueurs et rattachement aux équipes.",
    },
  ];

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
        Administration
      </h1>
      <p className="mb-6 mt-1 text-xs text-[var(--text-muted)]">
        {matches} match{matches > 1 ? "s" : ""} enregistré{matches > 1 ? "s" : ""} au total.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        {sections.map((s) => (
          <div key={s.href} className="flex flex-col gap-3">
            <Link
              href={s.href}
              className="flex flex-1 flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 transition-colors hover:border-[var(--border-strong)]"
            >
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold uppercase tracking-wide text-white">
                  {s.label}
                </span>
                <span className="stat text-2xl text-[var(--accent)]">{s.count}</span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">{s.description}</p>
            </Link>
            {s.createHref && (
              <Link
                href={s.createHref}
                className="rounded-lg bg-[var(--accent)] px-3 py-2 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                {s.createLabel}
              </Link>
            )}
          </div>
        ))}
      </div>

      <AdminAudience summary={audience} days={AUDIENCE_DAYS} />
    </main>
  );
}
