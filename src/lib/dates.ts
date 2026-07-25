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

/** Clé de regroupement par jour (AAAA-MM-JJ), "no-date" si absente. */
export function dayKey(date: Date | null): string {
  if (!date) return "no-date";
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Libellé de jour (« lundi 27 juillet »), capitalisé, "Date à définir" si absente. */
export function dayLabel(date: Date | null): string {
  if (!date) return "Date à définir";
  const s = new Date(date).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Date courte numérique (« 27/07 »), "--/--" si absente. */
export function shortDate(date: Date | null): string {
  if (!date) return "--/--";
  return new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

/** Heure (« 18:30 »), "--:--" si absente. */
export function timeLabel(date: Date | null): string {
  if (!date) return "--:--";
  return new Date(date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
