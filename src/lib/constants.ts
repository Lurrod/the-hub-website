export const REGIONS = [
  "France",
  "Benelux",
  "DACH",
  "Iberia",
  "EU",
  "Autre",
] as const;
export type Region = (typeof REGIONS)[number];

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 Mo
export const ALLOWED_IMAGE_TYPES: Record<string, "png" | "jpg" | "webp"> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export const TOURNAMENT_FORMATS = ["GROUPS", "SINGLE_ELIM", "GROUPS_THEN_ELIM"] as const;
export type TournamentFormat = (typeof TOURNAMENT_FORMATS)[number];
export const TOURNAMENT_FORMAT_LABELS: Record<TournamentFormat, string> = {
  GROUPS: "Poules",
  SINGLE_ELIM: "Élimination directe",
  GROUPS_THEN_ELIM: "Poules puis élimination",
};

export const TOURNAMENT_STATUSES = ["UPCOMING", "ONGOING", "FINISHED"] as const;
export type TournamentStatus = (typeof TOURNAMENT_STATUSES)[number];
export const TOURNAMENT_STATUS_LABELS: Record<TournamentStatus, string> = {
  UPCOMING: "À venir",
  ONGOING: "En cours",
  FINISHED: "Terminé",
};

export const MATCH_STAGES = ["GROUP", "BRACKET"] as const;
export type MatchStage = (typeof MATCH_STAGES)[number];
export const MATCH_STAGE_LABELS: Record<MatchStage, string> = {
  GROUP: "Poule",
  BRACKET: "Playoffs",
};

export const MATCH_STATUSES = ["SCHEDULED", "LIVE", "FINISHED"] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];
export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  SCHEDULED: "À jouer",
  LIVE: "En direct",
  FINISHED: "Terminé",
};

export const BEST_OF_OPTIONS = [1, 3, 5] as const;

export const VALORANT_MAPS = [
  "Ascent",
  "Bind",
  "Haven",
  "Split",
  "Icebox",
  "Breeze",
  "Fracture",
  "Pearl",
  "Lotus",
  "Sunset",
  "Abyss",
  "Corrode",
] as const;

/** Phases de match autorisées selon le format déclaré du tournoi. */
export const STAGES_BY_FORMAT: Record<TournamentFormat, readonly MatchStage[]> = {
  GROUPS: ["GROUP"],
  SINGLE_ELIM: ["BRACKET"],
  GROUPS_THEN_ELIM: ["GROUP", "BRACKET"],
};

/** Le format permet-il des poules (et donc des matchs de phase de poule) ? */
export function formatAllowsGroups(format: TournamentFormat): boolean {
  return STAGES_BY_FORMAT[format].includes("GROUP");
}
