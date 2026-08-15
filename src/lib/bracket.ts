import {
  isPremierFormat,
  type MatchForfeit,
  type MatchStage,
  type TournamentFormat,
} from "@/lib/constants";

export type BracketMatchData = {
  id: string;
  round: string | null;
  teamAId: string;
  teamBId: string;
  scoreA: number;
  scoreB: number;
  winnerId: string | null;
  /** Forfait déclaré : la case affiche « W / FF » à la place du score une
   * fois le match terminé — d'où le besoin du statut ici. */
  forfeit?: MatchForfeit | null;
  status?: string | null;
  position?: number | null;
  /** Bracket parallèle auquel le match appartient (Premier Contender). */
  groupId?: string | null;
  groupName?: string | null;
  teamA: { tag: string } | null;
  teamB: { tag: string } | null;
};

/** Une case de l'arbre : un match réel, ou un emplacement vide (bye). */
export type BracketSlot =
  { kind: "match"; key: string; match: BracketMatchData } | { kind: "bye"; key: string };

export type BracketRound = { name: string; slots: BracketSlot[] };

export type BracketSectionKey = "single" | "upper" | "lower" | "final";
export type BracketSection = {
  key: BracketSectionKey;
  /**
   * Identité propre quand plusieurs sections partagent la même `key` : c'est le
   * cas des brackets parallèles, tous clavetés « single » pour que la vitrine et
   * la carte OG continuent d'en trouver un.
   */
  id?: string;
  title: string;
  rounds: BracketRound[];
};

/**
 * Géométrie de rendu déduite du format :
 * - `tree`   : un seul arbre binaire (élimination directe, poules puis élim) ;
 * - `double` : upper + lower + grande finale ;
 * - `multi`  : plusieurs arbres côte à côte, un par bracket (Premier Contender) ;
 * - `flat`   : simples colonnes, sans arbre (suisse, ligue, round robin…).
 */
export type BracketLayout = "tree" | "double" | "multi" | "flat";

export type BracketTree = { layout: BracketLayout; sections: BracketSection[] };

const SECTION_ORDER: BracketSectionKey[] = ["single", "upper", "lower", "final"];
const SECTION_TITLE: Record<BracketSectionKey, string> = {
  single: "",
  upper: "Upper Bracket",
  lower: "Lower Bracket",
  final: "Grande Finale",
};

/** Libellé canonique d'un round selon le nombre de matchs qu'il contient. */
const ROUND_SIZE_LABELS: Record<number, string> = {
  1: "Finale",
  2: "Demi-finales",
  4: "Quarts de finale",
  8: "Huitièmes de finale",
  16: "Seizièmes de finale",
  32: "Trente-deuxièmes de finale",
};

export function roundLabelForSize(size: number): string {
  return ROUND_SIZE_LABELS[size] ?? `1/${size}e de finale`;
}

/** Minuscules, sans accents, espaces normalisés : base de toutes les regex. */
const DIACRITICS = /[̀-ͯ]/g;

function normalizeLabel(label: string): string {
  return label
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.:·-]+$/, "")
    .trim();
}

const SIZE_PATTERNS: { size: number; test: RegExp }[] = [
  { size: 1, test: /^(grande? )?finales?$/ },
  { size: 1, test: /^(grand )?finals?$/ },
  { size: 2, test: /^(demi|semi)/ },
  { size: 4, test: /^(quarts?|quarter|qf)/ },
  { size: 8, test: /^(huitiemes?|round of 16|ro ?16)/ },
  { size: 16, test: /^(seiziemes?|round of 32|ro ?32)/ },
  { size: 32, test: /^(trente|round of 64|ro ?64)/ },
];

/**
 * Taille d'arbre impliquée par un libellé de round (« Quarts de finale » → 4),
 * ou null si le libellé ne dit rien de la profondeur.
 */
export function roundSizeFromLabel(label: string): number | null {
  const n = normalizeLabel(label);
  const fraction = /^1\/(\d+)/.exec(n);
  if (fraction) {
    const size = Number(fraction[1]);
    return Number.isFinite(size) && size > 0 ? size : null;
  }
  for (const { size, test } of SIZE_PATTERNS) {
    if (test.test(n)) return size;
  }
  return null;
}

/** Numéro de tour d'un libellé générique (« Tour 2 », « Round 3 ») sinon null. */
function roundNumberFromLabel(label: string): number | null {
  const m = /^(?:tour|round|ronde|journee|j|r) ?(\d+)$/.exec(normalizeLabel(label));
  return m ? Number(m[1]) : null;
}

/** Libellé sans information propre, qu'on peut remplacer par le nom canonique. */
function isGenericLabel(label: string): boolean {
  const n = normalizeLabel(label);
  if (n === "" || n === "bracket" || n === "playoffs" || n === "playoff") return true;
  return roundNumberFromLabel(label) != null;
}

/**
 * Déduit la section (upper/lower/finale/simple) et le libellé de round depuis le
 * nom saisi. Reconnaît les préfixes UB/LB/Upper/Lower/Winners/Losers et les
 * grandes finales, de façon à supporter simple élim, double élim, swiss, etc.
 */
export function parseRound(round: string | null): { section: BracketSectionKey; label: string } {
  const r = (round ?? "Bracket").trim();
  const low = r.toLowerCase();
  if (/grande?\s*finale|grand\s*final/.test(low)) return { section: "final", label: r };
  if (/^(lb|lower|losers?)\b/.test(low) || /\b(lower\s*bracket|losers?\s*bracket)\b/.test(low)) {
    const label = r
      .replace(/^lb\s*[-:·]?\s*/i, "")
      .replace(/lower\s*bracket\s*[-:·]?\s*/i, "")
      .trim();
    return { section: "lower", label: label || r };
  }
  if (/^(ub|upper|winners?)\b/.test(low) || /\b(upper\s*bracket|winners?\s*bracket)\b/.test(low)) {
    const label = r
      .replace(/^ub\s*[-:·]?\s*/i, "")
      .replace(/upper\s*bracket\s*[-:·]?\s*/i, "")
      .trim();
    return { section: "upper", label: label || r };
  }
  return { section: "single", label: r };
}

/** Géométrie attendue pour un format donné, avant correction par les données. */
export function bracketLayoutFor(format: TournamentFormat): BracketLayout {
  if (format === "DOUBLE_ELIM") return "double";
  if (format === "PREMIER_CONTENDER") return "multi";
  if (format === "SINGLE_ELIM" || format === "GROUPS_THEN_ELIM" || format === "PREMIER_INVITE") {
    return "tree";
  }
  return "flat";
}

/**
 * Bo proposé par défaut à la saisie d'un match.
 *
 * Riot impose Bo1 sur tous les tours des playoffs Contender et Invite, sauf la
 * finale en Bo3. Le round peut ne pas encore exister (création d'un match) : on
 * répond alors Bo1, qui est juste pour tous les tours sauf un.
 */
export function defaultBestOfFor(format: TournamentFormat, round: string | null): number {
  if (!isPremierFormat(format)) return 1;
  return roundSizeFromLabel(round ?? "") === 1 ? 3 : 1;
}

/**
 * Groupe à persister sur un match selon sa phase et le format du tournoi.
 *
 * La règle historique « un groupe seulement en phase de poule » effaçait le
 * bracket des matchs Premier Contender — un format qui ne joue que des matchs
 * de stage BRACKET, rangés dans des `Group`. Tous ses matchs saisis via la
 * gestion sortaient orphelins et l'arbre public retombait en section unique.
 * On garde le groupe partout où la géométrie `multi` s'en sert, et nulle part
 * ailleurs : une poule accrochée à un match d'élimination prendrait la place
 * du tour dans les libellés.
 */
export function matchGroupIdFor(
  format: TournamentFormat,
  stage: MatchStage,
  groupId: string | null | undefined
): string | null {
  if (stage === "GROUP") return groupId ?? null;
  if (stage === "BRACKET" && bracketLayoutFor(format) === "multi") return groupId ?? null;
  return null;
}

type RawRound = { label: string; matches: BracketMatchData[] };

function minPosition(matches: BracketMatchData[]): number | null {
  const positions = matches
    .map((m) => m.position)
    .filter((p): p is number => p != null && Number.isFinite(p));
  return positions.length > 0 ? Math.min(...positions) : null;
}

/**
 * Clé de tri d'un round : les tours numérotés d'abord, puis ceux repérés par
 * `bracketPosition`, puis les rounds nommés, de l'entrée de tableau vers la
 * finale. Volontairement indépendant du nombre de matchs saisis, qui peut être
 * incomplet en cours de tournoi.
 */
function roundOrderKey(round: RawRound): number {
  const size = roundSizeFromLabel(round.label);
  if (size != null) return 1000 - Math.log2(size);
  const tour = roundNumberFromLabel(round.label);
  if (tour != null) return tour;
  const pos = minPosition(round.matches);
  if (pos != null) return 500 + pos / 100000;
  return 600;
}

function sortRounds(rounds: RawRound[]): RawRound[] {
  return [...rounds].sort(
    (a, b) => roundOrderKey(a) - roundOrderKey(b) || b.matches.length - a.matches.length
  );
}

function sortMatches(matches: BracketMatchData[]): BracketMatchData[] {
  return [...matches].sort(
    (a, b) =>
      (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER) ||
      a.id.localeCompare(b.id)
  );
}

function pow2Ceil(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/**
 * Répartit les matchs d'un round sur `size` emplacements. Si tous les matchs
 * portent un `bracketPosition` distinct et dans les bornes, il fait foi : les
 * trous restants deviennent des byes. Sinon on remplit dans l'ordre.
 */
function toSlots(matches: BracketMatchData[], size: number, roundKey: string): BracketSlot[] {
  const ordered = sortMatches(matches);
  const slots: (BracketMatchData | null)[] = Array.from({ length: size }, () => null);

  const positions = ordered.map((m) => m.position);
  const usablePositions =
    positions.every((p) => p != null && Number.isInteger(p) && p >= 1 && p <= size) &&
    new Set(positions).size === ordered.length;

  if (usablePositions) {
    for (const m of ordered) slots[m.position! - 1] = m;
  } else {
    ordered.forEach((m, i) => {
      slots[i] = m;
    });
  }

  return slots.map((m, i) =>
    m
      ? { kind: "match" as const, key: m.id, match: m }
      : { kind: "bye" as const, key: `${roundKey}-bye-${i}` }
  );
}

/**
 * Complète un enchaînement de rounds en arbre binaire : la taille de base est
 * la plus grande profondeur impliquée par l'un des rounds (son libellé ou son
 * nombre de matchs, arrondi à la puissance de 2 supérieure), puis chaque round
 * suivant vaut la moitié. Les emplacements manquants deviennent des byes -
 * c'est ce qui permet à un tableau de 6 ou 12 équipes de rester lisible.
 */
function buildTreeRounds(rounds: RawRound[]): BracketRound[] {
  if (rounds.length === 0) return [];

  const base = Math.max(
    ...rounds.map((r, i) => {
      const implied = Math.max(pow2Ceil(r.matches.length || 1), roundSizeFromLabel(r.label) ?? 1);
      return implied * 2 ** i;
    })
  );

  return rounds.map((r, i) => {
    const size = Math.max(1, Math.round(base / 2 ** i));
    const name = isGenericLabel(r.label) ? roundLabelForSize(size) : normalizedName(r.label, size);
    return { name, slots: toSlots(r.matches, size, `${name}-${i}`) };
  });
}

/** Uniformise l'orthographe d'un round reconnu, sinon garde le libellé saisi. */
function normalizedName(label: string, fallbackSize: number): string {
  const size = roundSizeFromLabel(label);
  if (size != null) return roundLabelForSize(size);
  return label || roundLabelForSize(fallbackSize);
}

/** Rounds sans géométrie d'arbre : pas de bye, on garde les matchs tels quels. */
function buildFlatRounds(rounds: RawRound[]): BracketRound[] {
  return rounds.map((r, i) => {
    const name = isGenericLabel(r.label)
      ? r.label.trim() || `Tour ${i + 1}`
      : normalizedName(r.label, r.matches.length || 1);
    return { name, slots: toSlots(r.matches, r.matches.length, `${name}-${i}`) };
  });
}

function groupBySection(matches: BracketMatchData[]): Map<BracketSectionKey, RawRound[]> {
  const bySection = new Map<BracketSectionKey, Map<string, BracketMatchData[]>>();
  for (const m of matches) {
    const { section, label } = parseRound(m.round);
    if (!bySection.has(section)) bySection.set(section, new Map());
    const rounds = bySection.get(section)!;
    const list = rounds.get(label) ?? [];
    list.push(m);
    rounds.set(label, list);
  }
  const out = new Map<BracketSectionKey, RawRound[]>();
  for (const [key, rounds] of bySection) {
    out.set(key, sortRounds([...rounds.entries()].map(([label, ms]) => ({ label, matches: ms }))));
  }
  return out;
}

/** Fusionne plusieurs listes de rounds en une seule, regroupée par libellé. */
function mergeRounds(...lists: (RawRound[] | undefined)[]): RawRound[] {
  const byLabel = new Map<string, BracketMatchData[]>();
  for (const list of lists) {
    for (const r of list ?? []) {
      const key = normalizeLabel(r.label);
      byLabel.set(key, [...(byLabel.get(key) ?? []), ...r.matches]);
    }
  }
  const labels = new Map<string, string>();
  for (const list of lists) {
    for (const r of list ?? []) {
      const key = normalizeLabel(r.label);
      if (!labels.has(key)) labels.set(key, r.label);
    }
  }
  return sortRounds(
    [...byLabel.entries()].map(([key, matches]) => ({ label: labels.get(key) ?? key, matches }))
  );
}

/** Les matchs d'un bracket parallèle, avant mise en arbre. */
type BracketBoard = { id: string | null; title: string; matches: BracketMatchData[] };

/**
 * Répartit les matchs par bracket parallèle, par nom croissant. Les matchs sans
 * groupe forment un dernier bloc plutôt que de disparaître : un rattachement
 * oublié doit se voir sur la page, pas se perdre.
 */
function partitionByBracket(matches: BracketMatchData[]): BracketBoard[] {
  const byId = new Map<string, BracketBoard>();
  const orphans: BracketMatchData[] = [];
  for (const m of matches) {
    if (!m.groupId) {
      orphans.push(m);
      continue;
    }
    const board = byId.get(m.groupId) ?? {
      id: m.groupId,
      title: m.groupName ?? m.groupId,
      matches: [],
    };
    byId.set(m.groupId, { ...board, matches: [...board.matches, m] });
  }
  const boards = [...byId.values()].sort((a, b) => a.title.localeCompare(b.title, "fr"));
  return orphans.length > 0
    ? [...boards, { id: null, title: "Hors bracket", matches: orphans }]
    : boards;
}

/** Rounds d'arbre d'un paquet de matchs : la logique de `tree`, réutilisable. */
function treeRoundsOf(matches: BracketMatchData[]): BracketRound[] {
  const bySection = groupBySection(matches);
  return buildTreeRounds(
    mergeRounds(bySection.get("single"), bySection.get("upper"), bySection.get("final"))
  );
}

/**
 * Construit l'arbre de playoffs à partir des matchs et du format du tournoi.
 * Le format choisit la géométrie ; les données peuvent la corriger (un lower
 * bracket présent force la double élimination, même si le format dit autre
 * chose), pour ne jamais rendre un arbre faux.
 *
 * Le garde-fou du lower bracket passe avant le partitionnement, donc il vaut
 * pour tout le tournoi : un seul match libellé « LB … » suffit à ramener un
 * Premier Contender à un arbre de double élimination, brackets parallèles
 * fusionnés. C'est assumé — les playoffs Premier s'y jouent en élimination
 * directe, un lower bracket y est une faute de saisie, et cette géométrie-là
 * affiche tous les matchs quand un `multi` amputé de sa section lower en
 * escamoterait.
 */
export function buildBracket(matches: BracketMatchData[], format: TournamentFormat): BracketTree {
  const bySection = groupBySection(matches);
  const declared = bracketLayoutFor(format);
  const hasLower = (bySection.get("lower")?.length ?? 0) > 0;
  const layout: BracketLayout = hasLower ? "double" : declared;

  if (layout === "double") {
    const sections: BracketSection[] = [];
    const upper = mergeRounds(bySection.get("upper"), bySection.get("single"));
    const lower = bySection.get("lower") ?? [];
    const final = bySection.get("final") ?? [];
    if (upper.length > 0)
      sections.push({ key: "upper", title: SECTION_TITLE.upper, rounds: buildTreeRounds(upper) });
    if (lower.length > 0)
      sections.push({ key: "lower", title: SECTION_TITLE.lower, rounds: buildFlatRounds(lower) });
    if (final.length > 0)
      sections.push({ key: "final", title: SECTION_TITLE.final, rounds: buildFlatRounds(final) });
    return { layout, sections };
  }

  if (layout === "tree") {
    // Élimination directe : tout tient dans un seul arbre, y compris un match
    // libellé « Grande finale ».
    const rounds = treeRoundsOf(matches);
    return { layout, sections: rounds.length > 0 ? [{ key: "single", title: "", rounds }] : [] };
  }

  if (layout === "multi") {
    const boards = partitionByBracket(matches);
    // Contender dont les brackets ne sont pas encore découpés : un arbre simple
    // vaut mieux qu'une unique section « Hors bracket ».
    if (boards.length === 1 && boards[0].id === null) {
      const rounds = treeRoundsOf(matches);
      return {
        layout: "tree",
        sections: rounds.length > 0 ? [{ key: "single", title: "", rounds }] : [],
      };
    }
    return {
      layout,
      sections: boards
        .map((b) => ({
          key: "single" as const,
          id: b.id ?? "hors-bracket",
          title: b.title,
          rounds: treeRoundsOf(b.matches),
        }))
        .filter((s) => s.rounds.length > 0),
    };
  }

  // Formats sans arbre : on liste les rounds en colonnes, dans l'ordre.
  const sections: BracketSection[] = [...bySection.entries()]
    .sort((a, b) => SECTION_ORDER.indexOf(a[0]) - SECTION_ORDER.indexOf(b[0]))
    .map(([key, rounds]) => ({ key, title: SECTION_TITLE[key], rounds: buildFlatRounds(rounds) }));
  return { layout, sections };
}
