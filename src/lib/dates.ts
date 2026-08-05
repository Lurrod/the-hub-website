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

/** Clé de regroupement par mois (AAAA-MM), "0000-00" si date absente. */
export function monthKey(date: Date | null): string {
  if (!date) return "0000-00";
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Libellé de mois (« juillet 2026 »), capitalisé. */
export function monthLabel(date: Date | null): string {
  if (!date) return "Dates à définir";
  const s = new Date(date).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
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
