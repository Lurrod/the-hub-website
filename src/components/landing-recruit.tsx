import Link from "next/link";
import { Facts, Panel, PanelHead, Tag } from "@/components/landing-panel-chrome";
import { getLandingRecruit, type LandingRecruit } from "@/lib/data/landing-recruit";
import { describeError, logger } from "@/lib/logger";

/**
 * Round 04 de la vitrine : les vraies annonces du moment.
 *
 * Seul panneau de la landing lu en base (voir `landing-recruit-core.ts` pour
 * le pourquoi). Chaque ligne mène à la fiche qu'elle résume : l'argument du
 * round, « l'annonce mène à la fiche », se vérifie en un clic.
 */

/**
 * La barre de filtres de la vraie page `/lft`, en décor : elle montre le geste
 * sans prétendre qu'un filtre est actif. Mêmes critères que la page — un
 * filtre qu'on ne retrouverait pas en y allant serait une promesse fausse.
 */
function FilterDecor() {
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-hidden="true">
      {["Rôle", "Pays", "Âge"].map((f) => (
        <span
          key={f}
          className="lf-t10 inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1 font-medium text-[var(--text-muted)]"
        >
          {f}
          <svg viewBox="0 0 8 5" className="h-1 w-2 text-[var(--text-subtle)]" aria-hidden="true">
            <path d="M0 0 L4 5 L8 0" fill="currentColor" />
          </svg>
        </span>
      ))}
      <span className="lf-t10 inline-flex items-center rounded-full border border-[var(--accent)]/50 bg-[var(--accent-soft)] px-2.5 py-1 font-semibold text-[var(--accent)]">
        LFT + LFP
      </span>
    </div>
  );
}

export function RecruitPanel({
  recruit,
  pending = false,
}: {
  recruit: LandingRecruit | null;
  /** Requête en cours : trois lignes en squelette plutôt qu'un « aucune annonce » trompeur. */
  pending?: boolean;
}) {
  const ads = recruit?.ads ?? [];

  return (
    <Panel>
      <PanelHead
        label="Annonces"
        right={
          recruit && (
            <span className="lf-t10 stat shrink-0 text-[var(--text-subtle)]">
              {recruit.lftCount} LFT<span className="dot-sep">·</span>
              {recruit.lfpCount} LFP
            </span>
          )
        }
      />
      <FilterDecor />
      {pending ? (
        <ul className="flex flex-col gap-2" aria-hidden="true">
          {[0, 1, 2].map((k) => (
            <li key={k} className="skeleton h-[58px] rounded-[var(--r-md)]" />
          ))}
        </ul>
      ) : ads.length === 0 ? (
        // Base vide ou injoignable : le panneau garde sa place et renvoie
        // vers la page, plutôt que d'exposer un cadre creux.
        <Link
          href="/lft"
          className="lf-t13 grid place-items-center rounded-[var(--r-md)] border border-dashed border-[var(--border-strong)] px-4 py-10 text-center text-[var(--text-muted)] transition-colors hover:text-white"
        >
          Aucune annonce en ce moment — la première peut être la vôtre.
        </Link>
      ) : (
        <ul className="flex flex-col gap-2">
          {ads.map((a, i) => (
            <li key={a.key} className="lf-hov-row" style={{ animationDelay: `${i * 80}ms` }}>
              <Link
                href={a.href}
                className="flex items-center gap-3 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 transition-colors hover:border-[var(--border-strong)]"
              >
                <Tag tag={a.tag} logo={a.logo} size="h-9 w-9" />
                <span className="min-w-0 flex-1">
                  <span className="lf-t13 block truncate font-semibold text-white">{a.name}</span>
                  <span className="lf-t11 mt-0.5 block truncate text-[var(--text-muted)]">
                    <Facts items={a.facts} />
                  </span>
                </span>
                <span
                  className={`lf-t10 shrink-0 rounded-full border px-2 py-1 font-semibold tracking-[0.1em] ${
                    a.kind === "LFT"
                      ? "lf-hov-pop border-[var(--accent)] text-[var(--accent)]"
                      : "border-[var(--border-strong)] text-[var(--text-muted)]"
                  }`}
                >
                  {a.kind}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/**
 * Lecture en base, isolée : une panne de la base ne doit coûter que ce
 * panneau, pas la landing entière — c'est la première page que voit un
 * visiteur.
 */
export default async function LandingRecruit() {
  const recruit = await getLandingRecruit().catch((error: unknown) => {
    logger.error("landing.recrutement.lecture_echec", describeError(error));
    return null;
  });
  return <RecruitPanel recruit={recruit} />;
}
