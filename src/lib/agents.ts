// Table nom d'agent -> chemin d'icone servi par le site (pas de fetch runtime).
// Les images viennent de valorant-api.com mais sont rapatriees dans public/ par
// `npm run assets:valorant` : le CDN tiers n'est plus sur le chemin de rendu et
// n'a plus a figurer dans img-src (voir scripts/fetch-valorant-assets.mjs).
// >>> table générée par `npm run assets:valorant` — ne pas éditer à la main
export const AGENT_ICONS: Record<string, string> = {
  Astra: "/valorant/agents/astra.webp",
  Breach: "/valorant/agents/breach.webp",
  Brimstone: "/valorant/agents/brimstone.webp",
  Chamber: "/valorant/agents/chamber.webp",
  Clove: "/valorant/agents/clove.webp",
  Cypher: "/valorant/agents/cypher.webp",
  Deadlock: "/valorant/agents/deadlock.webp",
  Fade: "/valorant/agents/fade.webp",
  Gekko: "/valorant/agents/gekko.webp",
  Harbor: "/valorant/agents/harbor.webp",
  Iso: "/valorant/agents/iso.webp",
  Jett: "/valorant/agents/jett.webp",
  "KAY/O": "/valorant/agents/kay-o.webp",
  Killjoy: "/valorant/agents/killjoy.webp",
  Miks: "/valorant/agents/miks.webp",
  Neon: "/valorant/agents/neon.webp",
  Omen: "/valorant/agents/omen.webp",
  Phoenix: "/valorant/agents/phoenix.webp",
  Raze: "/valorant/agents/raze.webp",
  Reyna: "/valorant/agents/reyna.webp",
  Sage: "/valorant/agents/sage.webp",
  Skye: "/valorant/agents/skye.webp",
  Sova: "/valorant/agents/sova.webp",
  Tejo: "/valorant/agents/tejo.webp",
  Veto: "/valorant/agents/veto.webp",
  Viper: "/valorant/agents/viper.webp",
  Vyse: "/valorant/agents/vyse.webp",
  Waylay: "/valorant/agents/waylay.webp",
  Yoru: "/valorant/agents/yoru.webp",
};
// <<< fin de la table générée

// Table nom d'agent -> couleur principale, figee (pas de fetch runtime), generee
// depuis valorant-api.com : on reprend backgroundGradientColors[0], la couleur
// que Riot donne a chaque agent (fond de son portrait en jeu), et on remonte sa
// clarte en OKLCH (L = 0.62, teinte conservee) pour qu'elle soit lisible sur le
// fond sombre du site. Les couleurs officielles brutes sont trop sombres.
//
// ATTENTION : cette palette est SEMANTIQUE, pas libre. Riot donne des teintes
// tres proches a plusieurs agents (Omen et Killjoy sont a un delta E de 5.7 en
// vision normale, Omen et Jett a 1.5 en deuteranopie). Elle ne peut donc jamais
// porter seule l'identite d'une part de graphique : le portrait de l'agent et
// son libelle doivent toujours l'accompagner.
export const AGENT_COLORS: Record<string, string> = {
  Astra: "#7b79d8",
  Breach: "#c76749",
  Brimstone: "#6a80d4",
  Chamber: "#278ecc",
  Clove: "#956dd5",
  Cypher: "#4a88d2",
  Deadlock: "#6880d4",
  Fade: "#6482d4",
  Gekko: "#9273c9",
  Harbor: "#009f81",
  Iso: "#747dd3",
  Jett: "#0093c5",
  "KAY/O": "#6781d4",
  Killjoy: "#a56bba",
  Miks: "#8f74cb",
  Neon: "#8577cf",
  Omen: "#8876ce",
  Phoenix: "#c76748",
  Raze: "#c8664f",
  Reyna: "#b167ab",
  Sage: "#009f89",
  Skye: "#339d63",
  Sova: "#5885d4",
  Tejo: "#c26d31",
  Veto: "#009bad",
  Viper: "#049e72",
  Vyse: "#9170d3",
  Waylay: "#9a70c4",
  Yoru: "#6c7fd4",
};

/** Couleur principale d'un agent, repli neutre si inconnu. */
export function agentColor(agent: string | null | undefined): string {
  if (!agent) return "var(--text-subtle)";
  return AGENT_COLORS[agent] ?? "var(--text-subtle)";
}

/** URL d'icone d'un agent par son nom, ou undefined si inconnu. */
export function agentIconUrl(agent: string | null | undefined): string | undefined {
  if (!agent) return undefined;
  return AGENT_ICONS[agent];
}

/**
 * Agents les plus joués, par joueur, à partir de lignes de scoreboard.
 * Une seule requête suffit ainsi pour tout un roster.
 */
export function rankTopAgentsByPlayer(
  rows: { playerId: string | null; agent: string | null }[],
  top = 3
): Map<string, string[]> {
  const counts = new Map<string, Map<string, number>>();
  for (const row of rows) {
    if (!row.playerId || !row.agent) continue;
    const byAgent = counts.get(row.playerId) ?? new Map<string, number>();
    byAgent.set(row.agent, (byAgent.get(row.agent) ?? 0) + 1);
    counts.set(row.playerId, byAgent);
  }
  const ranked = new Map<string, string[]>();
  for (const [playerId, byAgent] of counts) {
    ranked.set(
      playerId,
      [...byAgent.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, top)
        .map(([agent]) => agent)
    );
  }
  return ranked;
}
