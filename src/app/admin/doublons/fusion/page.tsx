import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-auth";
import { isAdmin } from "@/lib/permissions";
import { getPopulationsRapprochables } from "@/lib/data/doublons-equipes";
import { chercherDoublons, clePaire, relirePaire } from "@/lib/doublons-equipes-core";
import { fusionnerAction } from "@/app/admin/actions/doublons";
import { EmptyLine } from "@/components/empty-state";

export const metadata = { title: "Admin · Confirmer les fusions" };

/**
 * Récapitulatif avant fusion.
 *
 * Cette page existe parce que la fusion se fait par lot. Vingt paires cochées
 * d'un coup, ce sont vingt suppressions de fiches et autant de déplacements de
 * matchs déclenchés par un seul clic — et `Match.teamA` et `teamB` sont en
 * cascade. Sans cet arrêt, une paire mal cochée disparaîtrait dans le lot sans
 * que rien ne l'ait annoncée. On nomme donc ce qui va bouger, et on le nomme
 * pièce par pièce.
 *
 * Le récapitulatif est recalculé depuis la base, jamais repris du formulaire :
 * les compteurs affichés doivent décrire l'état au moment de confirmer, pas
 * celui de la page précédente.
 */
export default async function ConfirmerFusionsPage({
  searchParams,
}: {
  searchParams: Promise<{ paire?: string | string[] }>;
}) {
  const user = await getSessionUser();
  if (!isAdmin(user)) redirect("/");

  const { paire } = await searchParams;
  const demandees = new Set(
    (Array.isArray(paire) ? paire : paire ? [paire] : []).filter((c) => relirePaire(c) !== null)
  );

  const { miroir, manuelles, ecartees } = await getPopulationsRapprochables();
  // On repart des candidats et non des identifiants bruts : une paire qui n'est
  // plus proposée — écartée entre-temps, ou déjà fusionnée — ne doit pas
  // pouvoir être confirmée depuis une URL restée ouverte.
  const retenues = chercherDoublons(miroir, manuelles, ecartees).filter((p) =>
    demandees.has(clePaire(p.miroir.id, p.manuelle.id))
  );

  const total = retenues.reduce(
    (acc, p) => ({
      matchs: acc.matchs + p.miroir.matchs,
      inscriptions: acc.inscriptions + p.miroir.inscriptions,
      managers: acc.managers + p.miroir.managers,
      membres: acc.membres + p.miroir.membres,
    }),
    { matchs: 0, inscriptions: 0, managers: 0, membres: 0 }
  );

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
        Confirmer les fusions
      </h1>

      {retenues.length === 0 ? (
        <>
          <EmptyLine>
            Aucune des paires demandées n&apos;est encore proposée. Elles ont pu être écartées ou
            déjà fusionnées depuis.
          </EmptyLine>
          <Link href="/admin/doublons" className="mt-4 inline-block text-[var(--accent)]">
            Retour aux doublons
          </Link>
        </>
      ) : (
        <>
          <p className="mb-6 max-w-2xl text-[var(--text-muted)]">
            La fiche du miroir sera supprimée après que tout ce qu&apos;elle porte aura été déplacé
            sur la fiche saisie, qui recevra aussi son identifiant Riot. L&apos;opération ne se
            défait pas.
          </p>

          <div className="mb-6 rounded-lg border border-[var(--accent)] bg-[var(--surface)] p-4">
            <p className="mb-2 text-white">
              <span className="stat">{retenues.length}</span> fiche
              {retenues.length > 1 ? "s" : ""} du miroir {retenues.length > 1 ? "seront" : "sera"}{" "}
              supprimée{retenues.length > 1 ? "s" : ""}, après déplacement de :
            </p>
            <ul className="text-[var(--text-muted)]">
              <li>
                <span className="stat text-white">{total.matchs}</span> match
                {total.matchs > 1 ? "s" : ""}
              </li>
              <li>
                <span className="stat text-white">{total.inscriptions}</span> inscription
                {total.inscriptions > 1 ? "s" : ""} à des tournois
              </li>
              <li>
                <span className="stat text-white">{total.managers}</span> manager
                {total.managers > 1 ? "s" : ""}
              </li>
              <li>
                <span className="stat text-white">{total.membres}</span> adhésion
                {total.membres > 1 ? "s" : ""} de joueur
              </li>
            </ul>
          </div>

          <ul className="mb-6 divide-y divide-[var(--border)] overflow-hidden rounded-lg border border-[var(--border)]">
            {retenues.map((p) => (
              <li
                key={clePaire(p.miroir.id, p.manuelle.id)}
                className="bg-[var(--surface)] px-4 py-3"
              >
                <div className="text-white">
                  {p.miroir.name} <span className="text-[var(--text-muted)]">[{p.miroir.tag}]</span>{" "}
                  <span className="text-[var(--accent)]">→</span> {p.manuelle.name}{" "}
                  <span className="text-[var(--text-muted)]">[{p.manuelle.tag}]</span>
                </div>
                <div className="text-[var(--text-muted)]">
                  {p.miroir.matchs > 0 && <>{p.miroir.matchs} matchs · </>}
                  {p.miroir.inscriptions > 0 && <>{p.miroir.inscriptions} inscriptions · </>}
                  {p.miroir.managers > 0 && <>{p.miroir.managers} managers · </>}
                  {p.miroir.membres > 0 && <>{p.miroir.membres} joueurs · </>}
                  la fiche « {p.miroir.name} » disparaît
                  {p.confiance === "a-verifier" && (
                    <span className="text-[var(--accent)]">
                      {" "}
                      — rapprochée par le tag seul, à revérifier
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <form action={fusionnerAction} className="flex flex-wrap items-center gap-3">
            {retenues.map((p) => (
              <input
                key={clePaire(p.miroir.id, p.manuelle.id)}
                type="hidden"
                name="paire"
                value={clePaire(p.miroir.id, p.manuelle.id)}
              />
            ))}
            <button
              type="submit"
              className="rounded-lg bg-[var(--accent)] px-3 py-2 font-semibold transition-opacity hover:opacity-90"
            >
              Fusionner ces {retenues.length} paire{retenues.length > 1 ? "s" : ""}
            </button>
            <Link href="/admin/doublons" className="text-[var(--text-muted)] hover:text-white">
              Annuler
            </Link>
          </form>
        </>
      )}
    </main>
  );
}
