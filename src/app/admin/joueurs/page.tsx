import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-auth";
import { isAdmin } from "@/lib/permissions";
import { listAdminPlayers } from "@/lib/data/admin";
import { createPlayerAction } from "@/app/admin/actions/players";
import PlayerForm from "@/components/player-form";
import AdminSearch from "@/components/admin-search";
import Segmented from "@/components/segmented";
import { EmptyLine } from "@/components/empty-state";

export const metadata = { title: "Admin · Joueurs" };

const COMPTES: { cle?: string; label: string }[] = [
  { cle: undefined, label: "Tous" },
  { cle: "oui", label: "Avec compte" },
  { cle: "non", label: "Sans compte" },
];

export default async function AdminPlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; compte?: string }>;
}) {
  const user = await getSessionUser();
  if (!isAdmin(user)) redirect("/");

  const { q, compte } = await searchParams;
  const players = await listAdminPlayers({ q, compte });

  const href = (c?: string) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (c) sp.set("compte", c);
    const qs = sp.toString();
    return qs ? `/admin/joueurs?${qs}` : "/admin/joueurs";
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
        Joueurs
      </h1>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <AdminSearch action="/admin/joueurs" q={q} conserver={{ compte }} placeholder="Pseudo" />
        <Segmented activeKey={compte ?? "all"}>
          {COMPTES.map((c) => (
            <Link
              key={c.label}
              href={href(c.cle)}
              className="t-tab"
              role="tab"
              aria-selected={compte === c.cle}
            >
              {c.label}
            </Link>
          ))}
        </Segmented>
      </div>

      <p className="mb-3 text-xs text-[var(--text-muted)]">
        {players.length} joueur{players.length > 1 ? "s" : ""}
      </p>

      {players.length === 0 ? (
        <EmptyLine>Aucun joueur pour cette recherche.</EmptyLine>
      ) : (
        <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-lg border border-[var(--border)]">
          {players.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 p-3">
              <span className="text-white">
                {p.pseudo}
                {!p.userId && (
                  <span className="ml-2 text-[11px] text-[var(--text-subtle)]">sans compte</span>
                )}
              </span>
              <Link
                href={`/admin/joueurs/${p.id}`}
                className="shrink-0 text-xs text-[var(--accent)]"
              >
                Éditer
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Le formulaire descend sous la liste : au-dessus, il repoussait hors de
          l'écran le contenu qu'on vient consulter neuf fois sur dix. */}
      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold text-white">Nouveau joueur</h2>
        <PlayerForm action={createPlayerAction} submitLabel="Créer" />
      </section>
    </main>
  );
}
