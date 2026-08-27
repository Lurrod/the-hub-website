import { describe, it, expect } from "vitest";
import { agentIconUrl, rankTopAgentsByPlayer } from "@/lib/agents";

describe("agentIconUrl", () => {
  it("résout un agent connu", () => {
    expect(agentIconUrl("Jett")).toBe("/valorant/agents/jett.webp");
  });
  it("ignore un agent inconnu ou absent", () => {
    expect(agentIconUrl("Inconnu")).toBeUndefined();
    expect(agentIconUrl(null)).toBeUndefined();
  });
});

describe("rankTopAgentsByPlayer", () => {
  const rows = [
    { playerId: "p1", agent: "Jett" },
    { playerId: "p1", agent: "Jett" },
    { playerId: "p1", agent: "Raze" },
    { playerId: "p1", agent: "Neon" },
    { playerId: "p1", agent: "Neon" },
    { playerId: "p1", agent: "Yoru" },
    { playerId: "p2", agent: "Omen" },
  ];

  it("classe les agents du plus joué au moins joué", () => {
    expect(rankTopAgentsByPlayer(rows).get("p1")).toEqual(["Jett", "Neon", "Raze"]);
  });
  it("respecte la limite demandée", () => {
    expect(rankTopAgentsByPlayer(rows, 2).get("p1")).toEqual(["Jett", "Neon"]);
  });
  it("sépare les joueurs", () => {
    expect(rankTopAgentsByPlayer(rows).get("p2")).toEqual(["Omen"]);
  });
  it("ignore les lignes sans joueur ou sans agent", () => {
    const m = rankTopAgentsByPlayer([
      { playerId: null, agent: "Sage" },
      { playerId: "p3", agent: null },
    ]);
    expect(m.size).toBe(0);
  });
});
