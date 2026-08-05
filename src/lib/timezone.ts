/**
 * Conversions de date ancrées sur le fuseau du site.
 *
 * Un `<input type="datetime-local">` renvoie une heure locale SANS fuseau
 * (« 2026-08-05T20:30 »). L'interpréter avec `new Date()` la rattacherait au
 * fuseau du process : un organisateur qui saisit 20h30 verrait 22h30 affiché,
 * le serveur de production tournant en UTC. On ancre donc explicitement la
 * saisie ET l'affichage sur l'heure de Paris, quel que soit l'endroit où le
 * code s'exécute — serveur, navigateur ou CI.
 */
export const SITE_TIME_ZONE = "Europe/Paris";

const NAIVE_DATETIME = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?$/;

/**
 * Décalage du fuseau du site par rapport à UTC, en millisecondes, à l'instant
 * donné. Positif en France (UTC+1 l'hiver, UTC+2 l'été).
 */
function zoneOffsetMs(utcMs: number): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SITE_TIME_ZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  // `hour` peut valoir 24 pour minuit selon la version d'ICU.
  const asIfUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second")
  );
  return asIfUtc - utcMs;
}

/**
 * « 2026-08-05T20:30 » (heure de Paris) → instant UTC.
 * L'heure est facultative : sans elle, minuit heure de Paris.
 *
 * @returns null si la chaîne n'a pas la forme attendue.
 */
export function parseSiteDateTime(value: string): Date | null {
  const m = NAIVE_DATETIME.exec(value.trim());
  if (!m) return null;
  const [, y, mo, d, h = "00", mi = "00"] = m;
  const [year, month, day, hour, minute] = [y, mo, d, h, mi].map(Number);

  // `Date.UTC` reporte silencieusement les valeurs hors bornes : le mois 13
  // devient janvier de l'année suivante, le 31 février le 3 mars. Une saisie
  // absurde doit être refusée, pas réinterprétée.
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (hour > 23 || minute > 59) return null;

  const naive = Date.UTC(year, month - 1, day, hour, minute);
  if (Number.isNaN(naive)) return null;
  const check = new Date(naive);
  if (check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;

  // Deux passes : la première estime le décalage à partir de l'heure naïve, la
  // seconde le corrige avec celui réellement en vigueur à l'instant trouvé.
  // C'est ce qui rend juste une saisie faite le week-end du changement d'heure.
  const firstGuess = naive - zoneOffsetMs(naive);
  const utc = naive - zoneOffsetMs(firstGuess);
  const date = new Date(utc);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Une chaîne porte-t-elle une heure, ou seulement une date ? */
export function hasTimePart(value: string): boolean {
  const m = NAIVE_DATETIME.exec(value.trim());
  return Boolean(m && m[4] !== undefined);
}

/** Composants date/heure d'un instant, lus dans le fuseau du site. */
function siteParts(date: Date): Record<string, string> {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SITE_TIME_ZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);
  const out: Record<string, string> = {};
  for (const p of parts) if (p.type !== "literal") out[p.type] = p.value;
  return out;
}

/** Instant → « 2026-08-05T20:30 », valeur d'un `<input type="datetime-local">`. */
export function toDateTimeInput(date: Date | null): string {
  if (!date) return "";
  const p = siteParts(date);
  const hour = String(Number(p.hour) % 24).padStart(2, "0");
  return `${p.year}-${p.month}-${p.day}T${hour}:${p.minute}`;
}

/** Instant → « 2026-08-05 », valeur d'un `<input type="date">`. */
export function toDateInput(date: Date | null): string {
  if (!date) return "";
  const p = siteParts(date);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Formatage français ancré sur le fuseau du site. */
export function formatSite(date: Date | null, options: Intl.DateTimeFormatOptions): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("fr-FR", { ...options, timeZone: SITE_TIME_ZONE }).format(date);
}
