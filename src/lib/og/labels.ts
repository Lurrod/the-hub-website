import type { MatchStatus, TournamentStatus } from "@/lib/constants";

/*
 * Les dates de tournoi viennent d'un `<input type="date">` : elles sont donc
 * fixées à minuit UTC. Le fuseau est forcé à UTC au formatage, sinon un serveur
 * situé derrière UTC affiche la veille — « 12 août » deviendrait « 11 août ».
 */

/** Jour et mois en toutes lettres, sans année : « 12 août ». */
function dayMonth(date: Date): string {
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });
}

/** Jour, mois et année : « 12 août 2026 ». */
function fullDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Plage de dates d'un tournoi. L'année n'est écrite qu'une fois, et le mois
 * n'est répété que s'il change. Chaîne vide si aucune date n'est connue.
 */
export function dateRangeLabel(start: Date | null, end: Date | null): string {
  if (!start && !end) return "";
  if (!start) return fullDate(end as Date);
  if (!end) return fullDate(start);
  if (start.getTime() === end.getTime()) return fullDate(start);

  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const sameMonth = sameYear && start.getUTCMonth() === end.getUTCMonth();

  if (sameMonth) {
    return `${start.getUTCDate()} – ${fullDate(end)}`;
  }
  if (sameYear) {
    return `${dayMonth(start)} – ${fullDate(end)}`;
  }
  return `${fullDate(start)} – ${fullDate(end)}`;
}

/**
 * « 12/16 équipes », ou « 12 équipes » quand le tournoi n'a pas de limite.
 * Dans un rapport, le nom s'accorde sur la limite et non sur le nombre
 * d'inscrits : un tournoi encore vide affiche « 0/16 équipes ».
 */
export function teamCountLabel(count: number, max: number | null): string {
  const shown = max ?? count;
  const noun = shown > 1 ? "équipes" : "équipe";
  return max != null ? `${count}/${max} ${noun}` : `${count} ${noun}`;
}

/** « Bo3 ». */
export function bestOfLabel(bestOf: number): string {
  return `Bo${bestOf}`;
}

/** « 2 – 1 ». Tiret demi-cadratin, cohérent avec l'affichage du site. */
export function scoreLabel(a: number, b: number): string {
  return `${a} – ${b}`;
}

/** « Ascent 13-9 · Bind 8-13 ». Chaîne vide si le match n'a pas de map jouée. */
export function mapsLabel(
  maps: readonly { mapName: string; scoreA: number; scoreB: number }[]
): string {
  return maps.map((m) => `${m.mapName} ${m.scoreA}-${m.scoreB}`).join(" · ");
}

/** « 8V – 3D · 73% ». Chaîne vide tant que l'équipe n'a pas joué. */
export function recordLabel(record: {
  played: number;
  wins: number;
  losses: number;
  winrate: number;
}): string {
  if (record.played === 0) return "";
  return `${record.wins}V – ${record.losses}D · ${record.winrate}%`;
}

/** Différence de maps signée : « +7 », « -3 », « 0 ». */
export function mapDiffLabel(diff: number): string {
  return diff > 0 ? `+${diff}` : String(diff);
}

const DIACRITICS = /[\u0300-\u036f]/g;

/**
 * Lettre de repli affichée quand une entité n'a ni logo ni photo. Prend le
 * premier caractère alphanumérique, accents retirés ; « ? » si le nom n'en
 * contient aucun.
 */
export function monogram(name: string): string {
  const flat = name.normalize("NFD").replace(DIACRITICS, "");
  const match = flat.match(/[a-zA-Z0-9]/);
  return match ? match[0].toUpperCase() : "?";
}

/** Assemble des segments en écartant les vides : « Format · Région · Dates ». */
export function metaLine(parts: readonly (string | null | undefined)[]): string {
  return parts.filter((p): p is string => typeof p === "string" && p.length > 0).join(" · ");
}

const TOURNAMENT_BADGE_SUFFIX: Record<TournamentStatus, string> = {
  UPCOMING: "",
  ONGOING: " · EN COURS",
  FINISHED: " · TERMINÉ",
};

/** « TOURNOI · EN COURS ». Un tournoi à venir n'est pas suffixé : c'est le cas nominal. */
export function tournamentBadge(status: TournamentStatus): string {
  return `TOURNOI${TOURNAMENT_BADGE_SUFFIX[status]}`;
}

const MATCH_BADGE_SUFFIX: Record<MatchStatus, string> = {
  SCHEDULED: "",
  LIVE: " · EN DIRECT",
  FINISHED: " · TERMINÉ",
};

/** « MATCH · TERMINÉ ». Un match programmé n'est pas suffixé. */
export function matchBadge(status: MatchStatus): string {
  return `MATCH${MATCH_BADGE_SUFFIX[status]}`;
}
