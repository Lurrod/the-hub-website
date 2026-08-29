import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-auth";
import { isAdmin } from "@/lib/permissions";
import { alertesVisibles } from "@/lib/admin-core";
import { getAlerteCounts, getAdminActivity, getAdminCounts } from "@/lib/data/admin";
import { getAudienceSummary } from "@/lib/data/audience";
import AdminAudience from "@/components/admin-audience";
import { shortDate, timeLabel } from "@/lib/dates";

export const metadata = { title: "Administration" };

/** Fenêtre de la zone de fréquentation. */
const AUDIENCE_DAYS = 30;

/**
 * Accès aux sections d'administration.
 *
 * La refonte du tableau de bord a remplacé une grille de cartes par les trois
 * étages « à traiter / activité / chiffres », et a emporté avec elle la seule
 * navigation vers `/admin/equipes`, `/admin/joueurs` et `/admin/tournois`. Les
 * pages existaient toujours, leurs formulaires de création aussi, mais plus rien
 * n'y menait : créer une équipe ou un tournoi à la main était devenu impossible
 * sans connaître l'URL.
 *
 * Les indicateurs « à traiter » ne remplacent pas cette navigation : ils ne
 * s'affichent que lorsqu'ils sont non nuls, donc jamais quand tout va bien.
 *
 * `creer` est nul là où la création se fait sur la page de liste elle-même —
 * c'est le cas des joueurs, dont le formulaire est en bas de `/admin/joueurs`.
 */
const SECTIONS = [
  {
    libelle: "Tournois",
    href: "/admin/tournois",
    creer: "/admin/tournois/nouvelle",
    creerLibelle: "Nouveau tournoi",
  },
  {
    libelle: "Équipes",
    href: "/admin/equipes",
    creer: "/admin/equipes/nouvelle",
    creerLibelle: "Nouvelle équipe",
  },
  {
    libelle: "Joueurs",
    href: "/admin/joueurs",
    creer: null,
    creerLibelle: "Création sur la page",
  },
  {
    libelle: "Doublons",
    href: "/admin/doublons",
    creer: null,
    creerLibelle: "Rapprocher les fiches",
  },
] as const;

function ActiviteListe({
  titre,
  vide,
  children,
}: {
  titre: string;
  vide: string;
  children: React.ReactNode[];
}) {
  return (
    <div className="panel p-4">
      <h3 className="mb-2 text-[11px] uppercase tracking-wide text-[var(--text-subtle)]">
        {titre}
      </h3>
      <ul className="flex flex-col gap-1 text-xs">
        {children.length > 0 ? children : <li className="text-[var(--text-muted)]">{vide}</li>}
      </ul>
    </div>
  );
}

function LigneActivite({ href, libelle }: { href: string; libelle: string }) {
  return (
    <li>
      <Link href={href} className="transition-colors hover:text-[var(--accent)]">
        {libelle}
      </Link>
    </li>
  );
}

function Tuile({ libelle, valeur }: { libelle: string; valeur: number }) {
  return (
    <div className="panel p-4">
      <p className="text-[11px] uppercase tracking-wide text-[var(--text-subtle)]">{libelle}</p>
      <p className="stat mt-1 text-2xl text-white">{valeur}</p>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const user = await getSessionUser();
  if (!isAdmin(user)) redirect("/");

  const [comptes, activite, volumes, audience] = await Promise.all([
    getAlerteCounts(),
    getAdminActivity(),
    getAdminCounts(),
    getAudienceSummary(AUDIENCE_DAYS),
  ]);
  const alertes = alertesVisibles(comptes);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
        Administration
      </h1>

      {/* N'affiche que les indicateurs non nuls. Un mur de zéros n'apprend rien
          et fait perdre l'habitude de regarder ; une anomalie se voit
          précisément parce qu'elle n'est pas là d'habitude. */}
      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-white">À traiter</h2>
        {alertes.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">Rien à traiter.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-lg border border-[var(--border)]">
            {alertes.map((a) => (
              <li key={a.cle}>
                <Link
                  href={a.href}
                  className="flex items-center justify-between p-3 transition-colors hover:bg-[var(--table-row-hover)]"
                >
                  <span className="text-white">{a.libelle}</span>
                  <span className="stat text-[var(--accent)]">{a.compte}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold text-white">Gérer</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SECTIONS.map((s) => (
            <div key={s.href} className="panel flex flex-col gap-1 p-4">
              <Link
                href={s.href}
                className="text-white transition-colors hover:text-[var(--accent)]"
              >
                {s.libelle}
              </Link>
              {s.creer ? (
                <Link
                  href={s.creer}
                  className="text-[var(--accent)] transition-opacity hover:opacity-80"
                >
                  {s.creerLibelle}
                </Link>
              ) : (
                <span className="text-[var(--text-muted)]">{s.creerLibelle}</span>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-1 text-sm font-semibold text-white">Activité récente</h2>
        {/* Date **et** heure : la synchro passe toutes les cinq minutes le
            samedi soir, une date seule n'apprendrait rien. */}
        <p className="mb-3 text-xs text-[var(--text-muted)]">
          {activite.derniereSynchro
            ? `Dernière synchronisation Premier le ${shortDate(activite.derniereSynchro)} à ${timeLabel(activite.derniereSynchro)}.`
            : "Aucune synchronisation Premier enregistrée."}
        </p>
        {/* Trois panneaux et non deux : réunir équipes et inscriptions dans une
            même liste ne les distinguait que par une nuance de gris, et rien ne
            disait lequel des deux noms était une équipe. */}
        <div className="grid gap-4 sm:grid-cols-3">
          <ActiviteListe titre="Derniers matchs" vide="Aucun match.">
            {activite.matchs.map((m) => (
              <LigneActivite key={m.id} href={`/matchs/${m.id}`} libelle={m.nom} />
            ))}
          </ActiviteListe>
          <ActiviteListe titre="Dernières équipes" vide="Aucune équipe.">
            {activite.equipes.map((t) => (
              <LigneActivite key={t.id} href={`/equipes/${t.id}`} libelle={t.nom} />
            ))}
          </ActiviteListe>
          <ActiviteListe titre="Dernières inscriptions" vide="Aucune inscription.">
            {activite.inscriptions.map((p) => (
              <LigneActivite key={p.id} href={`/joueurs/${p.id}`} libelle={p.pseudo} />
            ))}
          </ActiviteListe>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold text-white">Chiffres</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Tuile libelle="Tournois" valeur={volumes.tournois} />
          <Tuile libelle="Équipes" valeur={volumes.equipes} />
          <Tuile libelle="Joueurs" valeur={volumes.joueurs} />
          <Tuile libelle="Matchs" valeur={volumes.matchs} />
        </div>
      </section>

      <AdminAudience summary={audience} days={AUDIENCE_DAYS} />
    </main>
  );
}
