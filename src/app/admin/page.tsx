import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-auth";
import { isAdmin } from "@/lib/permissions";
import { db } from "@/lib/db";
import SectionHeader from "@/components/section-header";

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

  const [teams, players, tournaments, matches] = await Promise.all([
    db.team.count(),
    db.player.count(),
    db.tournament.count(),
    db.match.count(),
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
      <div className="mb-8">
        <SectionHeader eyebrow="Administration" title="Tableau de bord" />
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {matches} match{matches > 1 ? "s" : ""} enregistré{matches > 1 ? "s" : ""} au total.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {sections.map((s) => (
          <div key={s.href} className="flex flex-col gap-4">
            <Link href={s.href} className="card card-interactive flex flex-col gap-2 p-5">
              <div className="flex items-baseline justify-between">
                <span className="font-semibold text-white">{s.label}</span>
                <span className="font-mono text-2xl text-[var(--accent)]">{s.count}</span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">{s.description}</p>
            </Link>
            {s.createHref && (
              <Link
                href={s.createHref}
                className="rounded bg-[var(--accent)] px-3 py-1.5 text-center text-sm font-medium text-white transition-colors duration-[130ms] hover:bg-[var(--accent-hover)]"
              >
                {s.createLabel}
              </Link>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
