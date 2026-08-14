import Link from "next/link";
import EmptyState, { BracketDecor } from "@/components/empty-state";
import BracketGrandFinalLines from "@/components/bracket-grand-final-lines";
import {
  buildBracket,
  type BracketMatchData,
  type BracketSection,
  type BracketSlot,
} from "@/lib/bracket";
import type { TournamentFormat } from "@/lib/constants";

export type { BracketMatchData };

/** Écart horizontal entre deux colonnes de rounds : sert aussi aux connecteurs. */
const GAP = 32;
const HALF_GAP = GAP / 2;

/** Intitulé de section, sans le tiret d'accent de `.eyebrow`. */
const SECTION_TITLE_CLASS =
  "mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-subtle)]";

export default function Bracket({
  matches,
  format,
}: {
  matches: BracketMatchData[];
  format: TournamentFormat;
}) {
  const { layout, sections } = buildBracket(matches, format);
  if (sections.length === 0) {
    return (
      <EmptyState
        title="Aucun bracket saisi"
        description="L'arbre se dessine dès que l'organisateur enregistre les rencontres à élimination directe, tour par tour."
        decor={<BracketDecor />}
      />
    );
  }

  // Double élimination : upper + lower empilés à gauche, grande finale à droite,
  // reliée aux deux finales.
  if (layout === "double") {
    const upper = sections.find((s) => s.key === "upper");
    const lower = sections.find((s) => s.key === "lower");
    const final = sections.find((s) => s.key === "final");

    // Un seul conteneur de défilement pour tout le bloc : upper et lower ont
    // rarement le même nombre de colonnes, deux zones de scroll distinctes
    // décaleraient les deux tableaux l'un par rapport à l'autre.
    return (
      <div className="scroll-accent overflow-x-auto pb-2">
        <BracketGrandFinalLines>
          <div className="flex items-stretch gap-10">
            <div className="flex flex-col gap-8">
              {upper && (
                <SectionBlock
                  section={upper}
                  connectors
                  scroll={false}
                  lastSlotAnchor={final ? "upper-final" : undefined}
                />
              )}
              {lower && (
                <SectionBlock
                  section={lower}
                  scroll={false}
                  lastSlotAnchor={final ? "lower-final" : undefined}
                />
              )}
            </div>

            {final && (
              <div className="flex w-[186px] shrink-0 flex-col">
                <div className={SECTION_TITLE_CLASS}>{final.title}</div>
                <div className="flex flex-1 flex-col justify-center gap-3">
                  {final.rounds
                    .flatMap((r) => r.slots)
                    .map((slot) => (
                      <div key={slot.key} data-bracket-anchor="grand-final">
                        <SlotCell slot={slot} />
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </BracketGrandFinalLines>
      </div>
    );
  }

  // « tree »  : élimination directe, un seul arbre avec connecteurs.
  // « multi » : un arbre par bracket parallèle, empilés, mêmes connecteurs.
  // « flat »  : formats sans arbre, colonnes simples.
  //
  // La clé React passe par `sec.id` : en « multi », toutes les sections portent
  // la même `key` métier (« single »), qui ne les distinguerait pas.
  return (
    <div className="space-y-8">
      {sections.map((sec) => (
        <SectionBlock
          key={sec.id ?? sec.key}
          section={sec}
          connectors={layout === "tree" || layout === "multi"}
        />
      ))}
    </div>
  );
}

function SectionBlock({
  section,
  connectors = false,
  scroll = true,
  lastSlotAnchor,
}: {
  section: BracketSection;
  connectors?: boolean;
  /** false quand un parent porte déjà le conteneur de défilement. */
  scroll?: boolean;
  /** Marque la dernière case de la section, cible des liaisons mesurées. */
  lastSlotAnchor?: string;
}) {
  const lastRound = section.rounds.length - 1;
  return (
    <div className="min-w-0">
      {section.title && <div className={SECTION_TITLE_CLASS}>{section.title}</div>}
      <div
        className={`flex items-stretch ${scroll ? "scroll-accent overflow-x-auto pb-2" : "w-max"}`}
        style={{ gap: GAP }}
      >
        {section.rounds.map((round, ri) => {
          const next = section.rounds[ri + 1];
          const hasPrev = connectors && ri > 0;
          const hasNext = connectors && next != null;
          // On ne joint deux cases par une accolade que si le round suivant
          // compte deux fois moins de cases : vrai pour un arbre binaire, faux
          // pour un lower bracket dont les rounds s'enchaînent 2-2-1-1.
          const pairs = hasNext && next.slots.length * 2 === round.slots.length;

          return (
            <div key={`${round.name}-${ri}`} className="flex w-[186px] shrink-0 flex-col">
              <div className="mb-3 truncate text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                {round.name}
              </div>
              <div className="flex flex-1 flex-col">
                {round.slots.map((slot, si) => (
                  <div
                    key={slot.key}
                    // py : respire entre deux cartes voisines sans décaler leur
                    // centre, donc sans casser l'alignement des connecteurs.
                    className="relative flex flex-1 items-center py-1"
                    data-bracket-anchor={
                      lastSlotAnchor && ri === lastRound && si === round.slots.length - 1
                        ? lastSlotAnchor
                        : undefined
                    }
                  >
                    <div className="w-full">
                      <SlotCell slot={slot} />
                    </div>
                    {hasPrev && (
                      <span
                        className="pointer-events-none absolute top-1/2 h-px bg-[var(--border-strong)]"
                        style={{ left: -HALF_GAP, width: HALF_GAP }}
                      />
                    )}
                    {hasNext && (
                      <span
                        className="pointer-events-none absolute top-1/2 h-px bg-[var(--border-strong)]"
                        style={{ right: -HALF_GAP, width: HALF_GAP }}
                      />
                    )}
                    {pairs && si % 2 === 0 && si + 1 < round.slots.length && (
                      <span
                        className="pointer-events-none absolute w-px bg-[var(--border-strong)]"
                        style={{ right: -HALF_GAP, top: "50%", height: "100%" }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SlotCell({ slot }: { slot: BracketSlot }) {
  return slot.kind === "match" ? <BracketCell match={slot.match} /> : <ByeCell />;
}

/** Emplacement vide : l'équipe qualifiée passe le tour sans jouer (bye). */
function ByeCell() {
  const row = "flex items-center justify-between px-2.5 py-1.5 text-sm text-[var(--text-muted)]";
  return (
    <div className="rounded-lg border border-dashed border-[var(--border)]">
      <div className={row}>
        <span className="truncate">Bye</span>
        <span className="stat">-</span>
      </div>
      <div className="border-t border-dashed border-[var(--border)]" />
      <div className={row}>
        <span className="truncate">-</span>
        <span className="stat">-</span>
      </div>
    </div>
  );
}

function BracketCell({ match }: { match: BracketMatchData }) {
  const aWin = match.winnerId != null && match.winnerId === match.teamAId;
  const bWin = match.winnerId != null && match.winnerId === match.teamBId;
  const row = "flex items-center justify-between px-2.5 py-1.5 text-sm";
  return (
    <Link
      href={`/matchs/${match.id}`}
      className="card block transition-colors hover:border-[var(--border-strong)]"
    >
      <div className={`${row} ${aWin ? "font-semibold text-[var(--accent)]" : "text-white"}`}>
        <span className="truncate">{match.teamA?.tag ?? "-"}</span>
        <span className="stat">{match.scoreA}</span>
      </div>
      <div className="border-t border-[var(--border)]" />
      <div className={`${row} ${bWin ? "font-semibold text-[var(--accent)]" : "text-white"}`}>
        <span className="truncate">{match.teamB?.tag ?? "-"}</span>
        <span className="stat">{match.scoreB}</span>
      </div>
    </Link>
  );
}
