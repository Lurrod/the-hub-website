import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-auth";
import { isAdmin } from "@/lib/permissions";
import { listAdminTeams } from "@/lib/data/admin";
import AdminSearch from "@/components/admin-search";
import Segmented from "@/components/segmented";
import { EmptyLine } from "@/components/empty-state";

export const metadata = { title: "Admin · Équipes" };

const ORIGINES: { cle?: string; label: string }[] = [
  { cle: undefined, label: "Toutes" },
  { cle: "miroir", label: "Miroir Premier" },
  { cle: "saisie", label: "Saisies" },
];

export default async function AdminTeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; origine?: string; anomalie?: string }>;
}) {
  const user = await getSessionUser();
  if (!isAdmin(user)) redirect("/");

  const { q, origine, anomalie } = await searchParams;
  const teams = await listAdminTeams({ q, origine, anomalie });

  const href = (o?: string) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (o) sp.set("origine", o);
    if (anomalie) sp.set("anomalie", anomalie);
    const qs = sp.toString();
    return qs ? `/admin/equipes?${qs}` : "/admin/equipes";
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
          Équipes
        </h1>
        <Link
          href="/admin/equipes/nouvelle"
          className="rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold transition-opacity hover:opacity-90"
        >
          Nouvelle équipe
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <AdminSearch
          action="/admin/equipes"
          q={q}
          conserver={{ origine, anomalie }}
          placeholder="Nom ou tag"
        />
        <Segmented activeKey={origine ?? "all"}>
          {ORIGINES.map((o) => (
            <Link
              key={o.label}
              href={href(o.cle)}
              className="t-tab"
              role="tab"
              aria-selected={origine === o.cle}
            >
              {o.label}
            </Link>
          ))}
        </Segmented>
      </div>

      <p className="mb-3 text-xs text-[var(--text-muted)]">
        {teams.length} équipe{teams.length > 1 ? "s" : ""}
      </p>

      {teams.length === 0 ? (
        <EmptyLine>Aucune équipe pour cette recherche.</EmptyLine>
      ) : (
        <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-lg border border-[var(--border)]">
          {teams.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 p-3">
              <span className="text-white">
                {t.name} <span className="text-[var(--text-muted)]">[{t.tag}]</span>
                {/* Marque l'origine : sur une fiche du miroir, Riot fait foi sur
                    le nom et l'éditer à la main sera écrasé au passage suivant. */}
                {t.premierManaged && (
                  <span className="ml-2 text-[11px] text-[var(--text-subtle)]">miroir</span>
                )}
              </span>
              <span className="flex shrink-0 gap-3 text-xs">
                <Link href={`/equipes/${t.id}/gestion`} className="text-[var(--accent)]">
                  Éditer
                </Link>
                <Link href={`/equipes/${t.id}/gestion/managers`} className="text-[var(--accent-2)]">
                  Managers
                </Link>
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
