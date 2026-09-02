import type { TournamentStatus } from "@/lib/constants";
import { formatSite, toDateInput } from "@/lib/timezone";

const DAY_MS = 86_400_000;

/** Nombre de jours (arrondi) entre aujourd'hui et `date` (négatif si passé). */
export function daysUntil(date: Date | null, now: Date): number | null {
  if (!date) return null;
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const n = new Date(now);
  n.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - n.getTime()) / DAY_MS);
}

/** Libellé « dans combien de jours » à partir d'un nombre de jours. */
export function countdownLabel(days: number | null): string {
  if (days === null) return "Date à définir";
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return "Demain";
  if (days > 1) return `Dans ${days} j`;
  if (days === -1) return "Hier";
  return "Terminé";
}

/**
 * Libellé du compte à rebours d'un tournoi : le statut prime sur la date de
 * début. Basé sur la seule date, un tournoi affichait « Terminé » dès le
 * surlendemain de son coup d'envoi alors que ses playoffs se jouaient encore.
 */
export function tournamentCountdownLabel(status: TournamentStatus, days: number | null): string {
  if (status === "FINISHED") return "Terminé";
  if (status === "ONGOING") return "En cours";
  return countdownLabel(days);
}

/**
 * Clé de regroupement par mois (AAAA-MM), "0000-00" si date absente.
 *
 * Le mois est celui de Paris. Ces deux fonctions étaient les seules de ce
 * module à lire le fuseau du système, alors qu'ecosystem.config.cjs affirme
 * que « les dates saisies et affichées sont ancrées sur Paris par le code, qui
 * ne dépend donc pas de ce réglage ». C'était faux : elles ne marchaient que
 * grâce au TZ posé par pm2. Un tournoi commençant le 1er août à 00h30 heure de
 * Paris se rangeait sous « Juillet » partout ailleurs — CI, conteneur, poste à
 * l'étranger.
 */
export function monthKey(date: Date | null): string {
  if (!date) return "0000-00";
  return toDateInput(new Date(date)).slice(0, 7);
}

/** Libellé de mois (« Juillet 2026 »), capitalisé, sur le fuseau de Paris. */
export function monthLabel(date: Date | null): string {
  if (!date) return "Dates à définir";
  const s = formatSite(new Date(date), { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Clé de regroupement par jour (AAAA-MM-JJ), "no-date" si absente.
 *
 * Le jour est celui de Paris, pas celui d'UTC : un match à 00h30 heure de
 * Paris tombe la veille en UTC et se retrouverait rangé sous le mauvais jour.
 */
export function dayKey(date: Date | null): string {
  return date ? toDateInput(new Date(date)) : "no-date";
}

/** Libellé de jour (« lundi 27 juillet »), capitalisé, "Date à définir" si absente. */
export function dayLabel(date: Date | null): string {
  if (!date) return "Date à définir";
  const s = formatSite(new Date(date), { weekday: "long", day: "numeric", month: "long" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Date courte numérique (« 27/07 »), "--/--" si absente. */
export function shortDate(date: Date | null): string {
  if (!date) return "--/--";
  return formatSite(new Date(date), { day: "2-digit", month: "2-digit" });
}

/**
 * Date numérique complète (« 27/07/2026 »), "--/--/----" si absente.
 *
 * L'année distingue `shortDate` : elle ne sert que là où des rencontres de
 * plusieurs saisons se suivent dans la même liste, où « 27/07 » seul ne dit
 * pas de quelle année il s'agit.
 */
export function fullDate(date: Date | null): string {
  if (!date) return "--/--/----";
  return formatSite(new Date(date), { day: "2-digit", month: "2-digit", year: "numeric" });
}

/**
 * Heure de coup d'envoi (« 18:30 »), heure de Paris.
 *
 * `hasTime` distingue un créneau réellement fixé d'une simple date : afficher
 * l'heure d'un match dont seule la date est connue reviendrait à inventer un
 * coup d'envoi à minuit.
 */
export function timeLabel(date: Date | null, hasTime = true): string {
  if (!date || !hasTime) return "--:--";
  return formatSite(new Date(date), { hour: "2-digit", minute: "2-digit" });
}

/** Âge en années révolues, null si la date de naissance est inconnue. */
export function computeAge(birthdate: Date | null, now: Date = new Date()): number | null {
  if (!birthdate) return null;
  const b = new Date(birthdate);
  let age = now.getFullYear() - b.getFullYear();
  const beforeBirthday =
    now.getMonth() < b.getMonth() ||
    (now.getMonth() === b.getMonth() && now.getDate() < b.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

/** Ancienneté compacte depuis `from` (« 12j », « 8m », « 3a »), null si absente. */
export function durationShort(from: Date | null, now: Date = new Date()): string | null {
  if (!from) return null;
  const start = new Date(from);
  const years = computeAge(start, now) ?? 0;
  if (years >= 1) return `${years}a`;
  const months =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth()) -
    (now.getDate() < start.getDate() ? 1 : 0);
  if (months >= 1) return `${months}m`;
  return `${Math.max(0, Math.round((now.getTime() - start.getTime()) / DAY_MS))}j`;
}

/**
 * Les cinq formats ci-dessous vivaient dupliqués dans huit composants, chacun
 * appelant `toLocaleDateString("fr-FR", …)` sans `timeZone` — donc sur le
 * fuseau du système, la dérive décrite plus haut pour `monthKey`. Ils rejoignent
 * ce module pour la même raison : une date affichée par le site est une date de
 * Paris, et cela ne doit pas dépendre de la machine qui rend la page.
 */

/** « juil. 2026 » — passages d'un joueur dans une équipe. */
export function shortMonth(date: Date): string {
  return formatSite(new Date(date), { month: "short", year: "numeric" });
}

/** « lun. 27 juil. 2026 » — en-tête de journée dans une liste de matchs. */
export function weekdayDate(date: Date): string {
  return formatSite(new Date(date), {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** « 27 juil. 2026 » — période d'un tournoi sur sa vignette. */
export function mediumDate(date: Date): string {
  return formatSite(new Date(date), { day: "numeric", month: "short", year: "numeric" });
}

/** « 27 juillet 2026 » — date d'un tournoi en pleine largeur. */
export function longDate(date: Date): string {
  return formatSite(new Date(date), { day: "numeric", month: "long", year: "numeric" });
}

/** « 27/07/2026 18:30 » — horodatage d'une récupération de statistiques. */
export function dateTimeLabel(date: Date): string {
  return formatSite(new Date(date), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
