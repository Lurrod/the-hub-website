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

/** Retire les accents sans toucher aux lettres qu'ils portent. */
function deaccent(value: string): string {
  return value.normalize("NFD").replace(DIACRITICS, "");
}

/**
 * Nom du fichier propos\u00e9 au t\u00e9l\u00e9chargement d'une carte de partage.
 *
 * Les accents sont retir\u00e9s plut\u00f4t que remplac\u00e9s, sinon \u00ab \u00c9quipe \u00bb deviendrait
 * \u00ab quipe \u00bb. Tout le reste de ce qui n'est pas alphanum\u00e9rique se replie en un
 * tiret unique : c'est le seul jeu de caract\u00e8res qu'aucun syst\u00e8me de fichiers
 * ne discute.
 *
 * @param parts segments \u00e0 encha\u00eener, par exemple `[nomA, "vs", nomB]`.
 */
export function shareCardFilename(parts: readonly string[]): string {
  const slug = deaccent(parts.join(" "))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  // Un nom r\u00e9duit au seul pr\u00e9fixe reste un fichier valide : mieux vaut \u00e7a
  // qu'un \u00ab -.png \u00bb quand le pseudo ne contient aucun caract\u00e8re latin.
  return slug ? `the-hub-${slug}.png` : "the-hub.png";
}

/**
 * Nom affich\u00e9 d'un joueur : celui de sa fiche, ou son Riot ID \u00e0 d\u00e9faut. Le tag
 * qui suit le \u00ab # \u00bb n'apporte rien sur une carte et allonge la ligne.
 */
export function displayName(pseudo: string | null, riotName: string | null): string {
  return pseudo ?? riotName?.split("#")[0] ?? "";
}

/** Statistique d'un joueur sur une map, telle que stock\u00e9e en base. */
export type MvpStat = {
  pseudo: string | null;
  riotName: string | null;
  rating: number;
  acs: number;
};

/**
 * Meilleure performance de la rencontre : \u00ab Sh1n \u00b7 1.42 rating \u00b7 312 ACS \u00bb.
 *
 * Le comparateur est strict, donc \u00e0 \u00e9galit\u00e9 de rating c'est le premier nomm\u00e9
 * qui reste \u2014 l'ordre des maps fait foi, sans d\u00e9partage arbitraire.
 * Cha\u00eene vide quand aucun scoreboard n'a \u00e9t\u00e9 import\u00e9.
 */
export function mvpLabel(stats: readonly MvpStat[]): string {
  if (stats.length === 0) return "";
  const best = stats.reduce((a, b) => (b.rating > a.rating ? b : a));
  const name = displayName(best.pseudo, best.riotName);
  return `${name} \u00b7 ${best.rating.toFixed(2)} rating \u00b7 ${Math.round(best.acs)} ACS`;
}

/** Nombre d'agents montr\u00e9s sur une carte : au-del\u00e0, la ligne d\u00e9borde. */
const AGENTS_SHOWN = 3;

/** \u00ab Jett 41% \u00b7 Raze 33% \u00b7 Neon 12% \u00bb. Cha\u00eene vide sans agent renseign\u00e9. */
export function agentsLabel(agents: readonly { agent: string; pct: number }[]): string {
  return agents
    .slice(0, AGENTS_SHOWN)
    .map((a) => `${a.agent} ${Math.round(a.pct)}%`)
    .join(" \u00b7 ");
}

/** Une case de la grille de chiffres : la valeur, et ce qu'elle mesure. */
export type StatCellValue = { value: string; label: string };

/**
 * Les six chiffres de carri\u00e8re affich\u00e9s sur la carte d'un joueur, dans l'ordre
 * de lecture. Grille vide tant qu'aucune map n'est enregistr\u00e9e : six z\u00e9ros
 * d\u00e9criraient un joueur mauvais, l\u00e0 o\u00f9 la donn\u00e9e est simplement absente.
 */
export function statGridValues(overview: {
  avgRating: number;
  avgAcs: number;
  kd: number;
  avgKast: number;
  avgHs: number;
  maps: number;
}): StatCellValue[] {
  if (overview.maps === 0) return [];
  return [
    { value: overview.avgRating.toFixed(2), label: "RATING" },
    { value: String(Math.round(overview.avgAcs)), label: "ACS" },
    { value: overview.kd.toFixed(2), label: "K/D" },
    { value: `${Math.round(overview.avgKast)}%`, label: "KAST" },
    { value: `${Math.round(overview.avgHs)}%`, label: "HS" },
    { value: String(overview.maps), label: "MAPS" },
  ];
}

/**
 * Lettre de repli affichée quand une entité n'a ni logo ni photo. Prend le
 * premier caractère alphanumérique, accents retirés ; « ? » si le nom n'en
 * contient aucun.
 */
export function monogram(name: string): string {
  const flat = deaccent(name);
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
