import { fullDate } from "@/lib/dates";

/**
 * Meta descriptions des fiches (tournoi, équipe, joueur, match).
 *
 * L'audit SEO du 17/08/2026 a montré que les ~170 fiches du site partageaient
 * mot pour mot la description générique du layout : Google les considère comme
 * dupliquées et réécrit les extraits. Chaque générateur assemble une phrase à
 * partir de champs déjà chargés par `generateMetadata` — aucune requête ici,
 * ce module reste pur et testable sans base.
 */

/** Longueur au-delà de laquelle Google tronque lui-même l'extrait. */
const MAX_DESCRIPTION = 160;

/**
 * Borne un texte libre à `max` caractères, sur un mot entier, ellipse comprise.
 * Les sauts de ligne sont aplatis : `team.description` est saisie par les
 * capitaines, souvent multi-lignes, et une meta description est monoligne.
 */
export function clampDescription(text: string, max = MAX_DESCRIPTION): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export function tournamentDescription(t: {
  name: string;
  startDate: Date | null;
  endDate: Date | null;
  teamCount: number;
}): string {
  const parts: string[] = [t.name];
  if (t.startDate) {
    const start = fullDate(t.startDate);
    const end = t.endDate ? fullDate(t.endDate) : start;
    parts.push(start === end ? `le ${start}` : `du ${start} au ${end}`);
  }
  const teams = t.teamCount > 0 ? `${t.teamCount} équipe${t.teamCount > 1 ? "s" : ""}, ` : "";
  return clampDescription(
    `${parts.join(" ")} : ${teams}bracket, résultats et stats complètes des matchs.`
  );
}

export function teamDescription(t: {
  name: string;
  tag: string;
  description: string | null;
}): string {
  const body =
    t.description?.trim() ||
    "roster, matchs, tournois et statistiques de l'équipe sur le Tier 3 Valorant francophone.";
  return clampDescription(`${t.name} (${t.tag}) : ${body}`);
}

export function playerDescription(p: { pseudo: string; teamName: string | null }): string {
  const who = p.teamName ? `${p.pseudo}, joueur de ${p.teamName}` : p.pseudo;
  return clampDescription(
    `${who} : rating, ACS, K/D, historique des matchs et carrière sur le Tier 3 Valorant francophone.`
  );
}

export function matchDescription(m: {
  teamAName: string;
  teamBName: string;
  scoreA: number;
  scoreB: number;
  finished: boolean;
  /** Camp forfaitaire : un « 0-0 » sur forfait serait un faux score. */
  forfeit?: "A" | "B" | null;
  tournamentName: string;
  date: Date | null;
}): string {
  const duel = m.finished
    ? m.forfeit
      ? m.forfeit === "A"
        ? `${m.teamBName} l'emporte par forfait face à ${m.teamAName}`
        : `${m.teamAName} l'emporte par forfait face à ${m.teamBName}`
      : `${m.teamAName} ${m.scoreA}-${m.scoreB} ${m.teamBName}`
    : `${m.teamAName} vs ${m.teamBName}${m.date ? ` le ${fullDate(m.date)}` : ""}`;
  const suite = m.finished
    ? "Scoreboard complet, stats par carte et timeline des rounds."
    : "Format, heure et stats des deux équipes.";
  return clampDescription(`${duel} — ${m.tournamentName}. ${suite}`);
}
