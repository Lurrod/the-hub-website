/** Durée compacte entre deux dates : « 2a 3m », « 5m », « 27j ». end null = maintenant. */
export function lengthLabel(start: Date | null, end: Date | null): string {
  if (!start) return "-";
  const s = new Date(start);
  const e = end ? new Date(end) : new Date();
  const days = Math.max(0, Math.round((e.getTime() - s.getTime()) / 86400000));
  if (days < 31) return `${days}j`;
  const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  if (months < 12) return `${months}m`;
  const y = Math.floor(months / 12);
  const mo = months % 12;
  return mo > 0 ? `${y}a ${mo}m` : `${y}a`;
}
