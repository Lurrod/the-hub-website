import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-auth";
import { isAdmin } from "@/lib/permissions";
import { getPopulationsRapprochables, listerPairesEcartees } from "@/lib/data/doublons-equipes";
import { chercherDoublons, type Confiance, type PaireDoublon } from "@/lib/doublons-equipes-core";
import { ecarterPaireAction, retablirPaireAction } from "@/app/admin/actions/doublons";
import { EmptyLine } from "@/components/empty-state";

export const metadata = { title: "Admin · Doublons d'équipes" };

const LIBELLE: Record<Confiance, string> = {
  sure: "Sûrs",
  probable: "Probables",
  "a-verifier": "À vérifier",
};

const EXPLICATION: Record<Confiance, string> = {
  sure: "Le nom et le tag concordent. Aucun contre-exemple relevé à ce jour.",
  probable: "Le nom concorde, le tag diffère. À lire avant de trancher.",
  "a-verifier":
    "Seul le tag concorde. C'est ici que vivent les faux positifs : deux squads d'une même structure partagent souvent un tag sans être la même équipe.",
};

const ORDRE: Confiance[] = ["sure", "probable", "a-verifier"];

/**
 * Une ligne de compteur, masquée à zéro pour ne pas noyer ce qui compte.
 *
 * Le pluriel est donné plutôt que déduit : « fiches du miroir » et « paires
 * écartées » accordent au milieu et à la fin, un `+ "s"` ne suffirait pas.
 */
function Compteur({
  valeur,
  libelle,
  pluriel,
}: {
  valeur: number;
  libelle: string;
  pluriel?: string;
}) {
  if (valeur === 0) return null;
  return (
    <span className="text-[var(--text-muted)]">
      <span className="stat text-white">{valeur}</span>{" "}
      {valeur > 1 ? (pluriel ?? libelle) : libelle}
    </span>
  );
}

function Fiche({
  equipe,
  role,
}: {
  equipe: PaireDoublon["miroir"];
  role: "Miroir Premier" | "Saisie à la main";
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
        {role}
      </div>
      <div className="mb-1 truncate text-white">
        {equipe.name} <span className="text-[var(--text-muted)]">[{equipe.tag}]</span>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        <Compteur valeur={equipe.membres} libelle="joueur" pluriel="joueurs" />
        <Compteur valeur={equipe.managers} libelle="manager" pluriel="managers" />
        <Compteur valeur={equipe.inscriptions} libelle="inscription" pluriel="inscriptions" />
        <Compteur valeur={equipe.matchs} libelle="match" pluriel="matchs" />
        {equipe.membres + equipe.managers + equipe.inscriptions + equipe.matchs === 0 && (
          <span className="text-[var(--text-muted)]">fiche vide</span>
        )}
      </div>
    </div>
  );
}

export default async function AdminDoublonsPage() {
  const user = await getSessionUser();
  if (!isAdmin(user)) redirect("/");

  const [{ miroir, manuelles, ecartees }, pairesEcartees] = await Promise.all([
    getPopulationsRapprochables(),
    listerPairesEcartees(),
  ]);
  const paires = chercherDoublons(miroir, manuelles, ecartees);
  const parConfiance = ORDRE.map((c) => ({
    confiance: c,
    lignes: paires.filter((p) => p.confiance === c),
  })).filter((g) => g.lignes.length > 0);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
        Doublons d&apos;équipes
      </h1>

      <p className="mb-6 max-w-2xl text-[var(--text-muted)]">
        La synchronisation Premier rattache les équipes par leur identifiant Riot, ce qui protège
        leur historique d&apos;un renommage. Mais à la première rencontre d&apos;une équipe
        inconnue, rien ne va voir si une fiche du site lui correspond déjà : elle en crée une neuve,
        et l&apos;équipe se retrouve en deux moitiés — les joueurs et les inscriptions d&apos;un
        côté, l&apos;historique Premier de l&apos;autre. Cette page rapproche les deux.
      </p>

      <div className="mb-8 flex flex-wrap gap-x-6 gap-y-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <Compteur valeur={miroir.length} libelle="fiche du miroir" pluriel="fiches du miroir" />
        <Compteur
          valeur={manuelles.length}
          libelle="fiche saisie non rattachée"
          pluriel="fiches saisies non rattachées"
        />
        <Compteur
          valeur={paires.length}
          libelle="rapprochement proposé"
          pluriel="rapprochements proposés"
        />
        <Compteur
          valeur={pairesEcartees.length}
          libelle="paire écartée"
          pluriel="paires écartées"
        />
      </div>

      {paires.length === 0 && (
        <EmptyLine>
          Aucun rapprochement à proposer. Toutes les fiches du miroir sont soit rattachées, soit
          sans correspondance connue.
        </EmptyLine>
      )}

      {parConfiance.map(({ confiance, lignes }) => (
        <section key={confiance} className="mb-10">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
            {LIBELLE[confiance]} <span className="text-[var(--text-muted)]">({lignes.length})</span>
          </h2>
          <p className="mb-3 max-w-2xl text-[var(--text-muted)]">{EXPLICATION[confiance]}</p>

          <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-lg border border-[var(--border)]">
            {lignes.map((p) => (
              <li key={`${p.miroir.id}:${p.manuelle.id}`} className="bg-[var(--surface)] p-4">
                {p.tagAmbigu && (
                  <p className="mb-2 text-[var(--accent)]">
                    Tag porté par plusieurs équipes — vérifier qu&apos;il ne s&apos;agit pas de deux
                    effectifs d&apos;une même structure.
                  </p>
                )}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <Fiche equipe={p.miroir} role="Miroir Premier" />
                  <Fiche equipe={p.manuelle} role="Saisie à la main" />
                  <div className="flex shrink-0 flex-col gap-2 sm:w-40">
                    <Link
                      href={`/equipes/${p.manuelle.id}`}
                      className="rounded-lg border border-[var(--border)] px-3 py-2 text-center transition-colors hover:bg-[var(--card-hover)]"
                    >
                      Voir la fiche saisie
                    </Link>
                    <form action={ecarterPaireAction}>
                      <input type="hidden" name="miroirId" value={p.miroir.id} />
                      <input type="hidden" name="manuelleId" value={p.manuelle.id} />
                      <button
                        type="submit"
                        className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--card-hover)] hover:text-white"
                      >
                        Ce n&apos;est pas un doublon
                      </button>
                    </form>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {pairesEcartees.length > 0 && (
        <section>
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
            Écartés <span className="text-[var(--text-muted)]">({pairesEcartees.length})</span>
          </h2>
          <p className="mb-3 max-w-2xl text-[var(--text-muted)]">
            Ces paires ne seront plus proposées, y compris après une resynchronisation.
          </p>
          <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-lg border border-[var(--border)]">
            {pairesEcartees.map((e) => (
              <li
                key={`${e.miroir.id}:${e.manuelle.id}`}
                className="flex flex-wrap items-center justify-between gap-3 bg-[var(--surface)] px-4 py-3"
              >
                <span className="text-[var(--text-muted)]">
                  <span className="text-white">
                    {e.miroir.name} [{e.miroir.tag}]
                  </span>{" "}
                  et{" "}
                  <span className="text-white">
                    {e.manuelle.name} [{e.manuelle.tag}]
                  </span>
                </span>
                <form action={retablirPaireAction}>
                  <input type="hidden" name="miroirId" value={e.miroir.id} />
                  <input type="hidden" name="manuelleId" value={e.manuelle.id} />
                  <button
                    type="submit"
                    className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--card-hover)] hover:text-white"
                  >
                    Reproposer
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
