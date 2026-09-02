/**
 * Durée compacte entre deux dates : « 2a 3m », « 5m », « 27j ». end null = maintenant.
 *
 * `now` est injectable, comme dans le reste de src/lib (computeAge,
 * durationShort, nextLftState, finishedCutoff, todayIso). C'était la seule
 * fonction d'horloge du dossier à ne pas l'être, et ça se payait au test : le
 * cas « fin absente » comparait le résultat à une durée écrite en dur, il a
 * donc cessé de passer trente jours après cette date, sans qu'aucune ligne de
 * code ait changé. Un test ne doit pas dépendre du jour où on l'exécute.
 */
export function lengthLabel(start: Date | null, end: Date | null, now: Date = new Date()): string {
  if (!start) return "-";
  const s = new Date(start);
  const e = end ? new Date(end) : now;
  const days = Math.max(0, Math.round((e.getTime() - s.getTime()) / 86400000));
  if (days < 31) return `${days}j`;
  const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  if (months < 12) return `${months}m`;
  const y = Math.floor(months / 12);
  const mo = months % 12;
  return mo > 0 ? `${y}a ${mo}m` : `${y}a`;
}
