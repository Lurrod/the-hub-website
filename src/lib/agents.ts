// Table nom d'agent -> URL d'icone (valorant-api.com), figee (pas de fetch runtime).
// Generee via valorant-api.com/v1/agents?isPlayableCharacter=true (displayName -> displayIcon).
export const AGENT_ICONS: Record<string, string> = {
  "Astra": "https://media.valorant-api.com/agents/41fb69c1-4189-7b37-f117-bcaf1e96f1bf/displayicon.png",
  "Breach": "https://media.valorant-api.com/agents/5f8d3a7f-467b-97f3-062c-13acf203c006/displayicon.png",
  "Brimstone": "https://media.valorant-api.com/agents/9f0d8ba9-4140-b941-57d3-a7ad57c6b417/displayicon.png",
  "Chamber": "https://media.valorant-api.com/agents/22697a3d-45bf-8dd7-4fec-84a9e28c69d7/displayicon.png",
  "Clove": "https://media.valorant-api.com/agents/1dbf2edd-4729-0984-3115-daa5eed44993/displayicon.png",
  "Cypher": "https://media.valorant-api.com/agents/117ed9e3-49f3-6512-3ccf-0cada7e3823b/displayicon.png",
  "Deadlock": "https://media.valorant-api.com/agents/cc8b64c8-4b25-4ff9-6e7f-37b4da43d235/displayicon.png",
  "Fade": "https://media.valorant-api.com/agents/dade69b4-4f5a-8528-247b-219e5a1facd6/displayicon.png",
  "Gekko": "https://media.valorant-api.com/agents/e370fa57-4757-3604-3648-499e1f642d3f/displayicon.png",
  "Harbor": "https://media.valorant-api.com/agents/95b78ed7-4637-86d9-7e41-71ba8c293152/displayicon.png",
  "Iso": "https://media.valorant-api.com/agents/0e38b510-41a8-5780-5e8f-568b2a4f2d6c/displayicon.png",
  "Jett": "https://media.valorant-api.com/agents/add6443a-41bd-e414-f6ad-e58d267f4e95/displayicon.png",
  "KAY/O": "https://media.valorant-api.com/agents/601dbbe7-43ce-be57-2a40-4abd24953621/displayicon.png",
  "Killjoy": "https://media.valorant-api.com/agents/1e58de9c-4950-5125-93e9-a0aee9f98746/displayicon.png",
  "Miks": "https://media.valorant-api.com/agents/7c8a4701-4de6-9355-b254-e09bc2a34b72/displayicon.png",
  "Neon": "https://media.valorant-api.com/agents/bb2a4828-46eb-8cd1-e765-15848195d751/displayicon.png",
  "Omen": "https://media.valorant-api.com/agents/8e253930-4c05-31dd-1b6c-968525494517/displayicon.png",
  "Phoenix": "https://media.valorant-api.com/agents/eb93336a-449b-9c1b-0a54-a891f7921d69/displayicon.png",
  "Raze": "https://media.valorant-api.com/agents/f94c3b30-42be-e959-889c-5aa313dba261/displayicon.png",
  "Reyna": "https://media.valorant-api.com/agents/a3bfb853-43b2-7238-a4f1-ad90e9e46bcc/displayicon.png",
  "Sage": "https://media.valorant-api.com/agents/569fdd95-4d10-43ab-ca70-79becc718b46/displayicon.png",
  "Skye": "https://media.valorant-api.com/agents/6f2a04ca-43e0-be17-7f36-b3908627744d/displayicon.png",
  "Sova": "https://media.valorant-api.com/agents/320b2a48-4d9b-a075-30f1-1f93a9b638fa/displayicon.png",
  "Tejo": "https://media.valorant-api.com/agents/b444168c-4e35-8076-db47-ef9bf368f384/displayicon.png",
  "Veto": "https://media.valorant-api.com/agents/92eeef5d-43b5-1d4a-8d03-b3927a09034b/displayicon.png",
  "Viper": "https://media.valorant-api.com/agents/707eab51-4836-f488-046a-cda6bf494859/displayicon.png",
  "Vyse": "https://media.valorant-api.com/agents/efba5359-4016-a1e5-7626-b1ae76895940/displayicon.png",
  "Waylay": "https://media.valorant-api.com/agents/df1cb487-4902-002e-5c17-d28e83e78588/displayicon.png",
  "Yoru": "https://media.valorant-api.com/agents/7f94d92c-4234-0a36-9646-3a87eb8b5c89/displayicon.png",
};

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
