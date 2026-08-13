/**
 * Lecture, écriture et découpage en calendrier des dates saisies à la main.
 *
 * Le calendrier natif d'un `<input type="date">` n'est pas habillable : ni son
 * fond, ni sa typographie, ni ses couleurs ne suivent la charte. `DateField`
 * le remplace par un calendrier maison, et ce module tient la conversion entre
 * ce que voit l'organisateur (« 13/08/2026 ») et ce que le formulaire envoie
 * (« 2026-08-13 »), la même valeur naïve que produisait l'input natif — rien
 * ne change côté serveur ni en base.
 *
 * Tout se fait sur des chaînes et des nombres : pas de `new Date()` pour
 * interpréter une saisie, sinon la date bascule d'un jour selon le fuseau du
 * navigateur. Voir `timezone.ts` pour l'ancrage sur l'heure de Paris, qui reste
 * la seule autorité sur ce que vaut une saisie en instant réel.
 */

export type CalendarCell = {
  /** « 2026-08-13 » */
  iso: string;
  /** Numéro du jour, pour l'affichage. */
  day: number;
  /** Faux pour les jours de complément en tête et en fin de grille. */
  currentMonth: boolean;
};

export type MonthRef = { year: number; month: number };

export const WEEKDAYS_FR = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"] as const;

const MONTHS_FR = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
] as const;

const ISO = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/;

const pad = (n: number) => String(n).padStart(2, "0");

/** Nombre de jours du mois, 29 février compris. */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function isRealDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > daysInMonth(year, month)) return false;
  return true;
}

/** Découpe « 2026-08-13 » ou « 2026-08-13T20:30 ». */
function readIso(value: string): { year: number; month: number; day: number; time: string } | null {
  const m = ISO.exec(value.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi] = m;
  const [year, month, day] = [y, mo, d].map(Number);
  if (!isRealDate(year, month, day)) return null;
  if (h !== undefined && (Number(h) > 23 || Number(mi) > 59)) return null;
  return { year, month, day, time: h === undefined ? "" : `${h}:${mi}` };
}

/** « 2026-08-13 » → « 13/08/2026 ». Chaîne vide si la valeur est illisible. */
export function toFrDate(value: string): string {
  const p = readIso(value);
  return p ? `${pad(p.day)}/${pad(p.month)}/${p.year}` : "";
}

/** « 2026-08-13T20:30 » → « 13/08/2026 20:30 ». */
export function toFrDateTime(value: string): string {
  const p = readIso(value);
  if (!p) return "";
  const date = `${pad(p.day)}/${pad(p.month)}/${p.year}`;
  return p.time ? `${date} ${p.time}` : date;
}

/**
 * « 13/08/2026 » → « 2026-08-13 », null si la date n'existe pas.
 *
 * Les séparateurs sont libres et l'année peut être écrite sur deux chiffres :
 * une date se tape vite, et refuser « 1/8/26 » ferait recommencer la saisie
 * pour rien.
 */
export function fromFrDate(text: string): string | null {
  const t = text.trim();
  if (!t) return null;

  const compact = /^(\d{2})(\d{2})(\d{4})$/.exec(t);
  const spaced = /^(\d{1,2})\s*[/\-. ]\s*(\d{1,2})\s*[/\-. ]\s*(\d{2}|\d{4})$/.exec(t);
  const m = compact ?? spaced;
  if (!m) return null;

  const day = Number(m[1]);
  const month = Number(m[2]);
  // Une année sur deux chiffres se lit dans le siècle courant : personne ne
  // saisit 1926 en tapant « 26 ».
  const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  if (!isRealDate(year, month, day)) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** « 13/08/2026 20:30 » → « 2026-08-13T20:30 ». Minuit si l'heure manque. */
export function fromFrDateTime(text: string): string | null {
  const t = text.trim();
  if (!t) return null;

  const split = /^(.*?)(?:\s+(\d{1,2})\s*[:h]\s*(\d{2}))?$/.exec(t);
  if (!split) return null;
  const date = fromFrDate(split[1]);
  if (!date) return null;
  if (split[2] === undefined) return `${date}T00:00`;

  const hour = Number(split[2]);
  const minute = Number(split[3]);
  if (hour > 23 || minute > 59) return null;
  return `${date}T${pad(hour)}:${pad(minute)}`;
}

/**
 * Les 42 cases du calendrier, lundi en tête. Six semaines toujours, même quand
 * cinq suffiraient : sinon la hauteur du panneau saute d'un mois à l'autre.
 */
export function monthCells(year: number, month: number): CalendarCell[] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  // getUTCDay() met dimanche à 0 ; on décale pour ouvrir la semaine le lundi.
  const lead = (first.getUTCDay() + 6) % 7;
  const start = Date.UTC(year, month - 1, 1 - lead);

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start + i * 86_400_000);
    const y = d.getUTCFullYear();
    const mo = d.getUTCMonth() + 1;
    const day = d.getUTCDate();
    return {
      iso: `${y}-${pad(mo)}-${pad(day)}`,
      day,
      currentMonth: mo === month && y === year,
    };
  });
}

/** « août 2026 », en tête du calendrier. */
export function monthTitle(year: number, month: number): string {
  return `${MONTHS_FR[month - 1]} ${year}`;
}

export function shiftMonth(ref: MonthRef, delta: number): MonthRef {
  const total = ref.year * 12 + (ref.month - 1) + delta;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

/** Mois ouvert au premier clic : celui de la valeur déjà saisie, sinon celui du jour. */
export function initialMonth(value: string, today: string): MonthRef {
  const p = readIso(value) ?? readIso(today);
  return p ? { year: p.year, month: p.month } : { year: 1970, month: 1 };
}

/**
 * Jour courant au format ISO, lu sur l'horloge locale. Passer par UTC ferait
 * afficher « demain » comme jour courant à partir de 22 h en France.
 */
export function todayIso(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Partie heure d'une valeur datetime, « 20:30 », ou chaîne vide. */
export function timePart(value: string): string {
  return readIso(value)?.time ?? "";
}

/** Recompose une valeur datetime après un clic dans le calendrier. */
export function joinDateTime(iso: string, time: string): string {
  if (!iso) return "";
  return `${iso}T${time || "00:00"}`;
}
