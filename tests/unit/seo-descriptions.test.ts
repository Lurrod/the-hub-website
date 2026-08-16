import { describe, it, expect } from "vitest";
import {
  clampDescription,
  tournamentDescription,
  teamDescription,
  playerDescription,
  matchDescription,
} from "@/lib/seo-descriptions";

// Les quatre familles de fiches partageaient la même meta description
// générique (audit SEO du 17/08/2026) : ces générateurs produisent une
// description propre à chaque entité, à partir des champs déjà en base.

describe("clampDescription", () => {
  it("laisse intact un texte sous la limite", () => {
    expect(clampDescription("Court.", 160)).toBe("Court.");
  });

  it("coupe sur un mot entier et pose une ellipse", () => {
    const out = clampDescription("aaa bbb ccc ddd", 11);
    expect(out.length).toBeLessThanOrEqual(11);
    expect(out).toBe("aaa bbb…");
  });

  it("aplatit les sauts de ligne d'un texte libre", () => {
    // team.description est saisie par les capitaines, souvent multi-lignes.
    expect(clampDescription("ligne 1\nligne 2", 160)).toBe("ligne 1 ligne 2");
  });
});

describe("tournamentDescription", () => {
  it("assemble nom, dates et nombre d'équipes", () => {
    const d = tournamentDescription({
      name: "Playoff Premier Contender V26A4",
      startDate: new Date("2026-08-15T00:00:00Z"),
      endDate: new Date("2026-08-16T00:00:00Z"),
      teamCount: 16,
    });
    expect(d).toBe(
      "Playoff Premier Contender V26A4 du 15/08/2026 au 16/08/2026 : " +
        "16 équipes, bracket, résultats et stats complètes des matchs."
    );
  });

  it("passe au singulier et à la date unique quand il le faut", () => {
    const d = tournamentDescription({
      name: "Showmatch",
      startDate: new Date("2026-08-15T00:00:00Z"),
      endDate: new Date("2026-08-15T00:00:00Z"),
      teamCount: 1,
    });
    expect(d).toContain("le 15/08/2026");
    expect(d).toContain("1 équipe,");
  });

  it("reste utilisable sans dates ni équipes inscrites", () => {
    const d = tournamentDescription({
      name: "Open à venir",
      startDate: null,
      endDate: null,
      teamCount: 0,
    });
    expect(d).toBe("Open à venir : bracket, résultats et stats complètes des matchs.");
  });
});

describe("teamDescription", () => {
  it("reprend la description saisie par l'équipe quand elle existe", () => {
    const d = teamDescription({
      name: "AZ Rising",
      tag: "AZR",
      description: "Structure francophone montée en 2025.",
    });
    expect(d).toBe("AZ Rising (AZR) : Structure francophone montée en 2025.");
  });

  it("retombe sur un gabarit quand l'équipe n'a rien écrit", () => {
    const d = teamDescription({ name: "AZ Rising", tag: "AZR", description: null });
    expect(d).toBe(
      "AZ Rising (AZR) : roster, matchs, tournois et statistiques de l'équipe " +
        "sur le Tier 3 Valorant francophone."
    );
  });

  it("borne une description libre trop longue", () => {
    const d = teamDescription({ name: "X", tag: "X", description: "mot ".repeat(100) });
    expect(d.length).toBeLessThanOrEqual(160);
    expect(d.endsWith("…")).toBe(true);
  });
});

describe("playerDescription", () => {
  it("cite l'équipe courante quand le joueur en a une", () => {
    expect(playerDescription({ pseudo: "Paingu", teamName: "Lyost" })).toBe(
      "Paingu, joueur de Lyost : rating, ACS, K/D, historique des matchs et " +
        "carrière sur le Tier 3 Valorant francophone."
    );
  });

  it("reste correct pour un joueur sans équipe", () => {
    expect(playerDescription({ pseudo: "Paingu", teamName: null })).toBe(
      "Paingu : rating, ACS, K/D, historique des matchs et carrière sur le " +
        "Tier 3 Valorant francophone."
    );
  });
});

describe("matchDescription", () => {
  it("donne le score d'un match terminé", () => {
    const d = matchDescription({
      teamAName: "NoCorp",
      teamBName: "Origin Purple",
      scoreA: 2,
      scoreB: 0,
      finished: true,
      tournamentName: "Playoff Premier Contender V26A4",
      date: new Date("2026-08-16T17:15:00Z"),
    });
    expect(d).toBe(
      "NoCorp 2-0 Origin Purple — Playoff Premier Contender V26A4. " +
        "Scoreboard complet, stats par carte et timeline des rounds."
    );
  });

  it("décrit un forfait en toutes lettres plutôt qu'un faux score", () => {
    const d = matchDescription({
      teamAName: "NoCorp",
      teamBName: "AZ Rising",
      scoreA: 0,
      scoreB: 0,
      finished: true,
      forfeit: "B",
      tournamentName: "Playoff Premier Contender V26A4",
      date: new Date("2026-08-15T17:15:00Z"),
    });
    expect(d).toBe(
      "NoCorp l'emporte par forfait face à AZ Rising — Playoff Premier Contender V26A4. " +
        "Scoreboard complet, stats par carte et timeline des rounds."
    );
  });

  it("annonce un match à venir par sa date, sans score inventé", () => {
    const d = matchDescription({
      teamAName: "NoCorp",
      teamBName: "Origin Purple",
      scoreA: 0,
      scoreB: 0,
      finished: false,
      tournamentName: "Playoff Premier Contender V26A4",
      date: new Date("2026-08-16T17:15:00Z"),
    });
    expect(d).toBe(
      "NoCorp vs Origin Purple le 16/08/2026 — Playoff Premier Contender V26A4. " +
        "Format, heure et stats des deux équipes."
    );
  });

  it("tolère l'absence de date sur un match à venir", () => {
    const d = matchDescription({
      teamAName: "A",
      teamBName: "B",
      scoreA: 0,
      scoreB: 0,
      finished: false,
      tournamentName: "T",
      date: null,
    });
    expect(d).toBe("A vs B — T. Format, heure et stats des deux équipes.");
  });
});
