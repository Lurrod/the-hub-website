import { describe, it, expect } from "vitest";
import {
  daysUntil,
  countdownLabel,
  tournamentCountdownLabel,
  monthKey,
  monthLabel,
  dayKey,
  fullDate,
  computeAge,
  durationShort,
} from "@/lib/dates";

const now = new Date("2026-07-25T12:00:00");

describe("daysUntil", () => {
  it("retourne null si pas de date", () => {
    expect(daysUntil(null, now)).toBe(null);
  });
  it("0 pour aujourd'hui", () => {
    expect(daysUntil(new Date("2026-07-25T23:00:00"), now)).toBe(0);
  });
  it("positif pour le futur", () => {
    expect(daysUntil(new Date("2026-07-30T08:00:00"), now)).toBe(5);
  });
  it("négatif pour le passé", () => {
    expect(daysUntil(new Date("2026-07-20T08:00:00"), now)).toBe(-5);
  });
});

describe("countdownLabel", () => {
  it("gère les cas particuliers", () => {
    expect(countdownLabel(null)).toBe("Date à définir");
    expect(countdownLabel(0)).toBe("Aujourd'hui");
    expect(countdownLabel(1)).toBe("Demain");
    expect(countdownLabel(5)).toBe("Dans 5 j");
    expect(countdownLabel(-1)).toBe("Hier");
    expect(countdownLabel(-3)).toBe("Terminé");
  });
});

describe("tournamentCountdownLabel", () => {
  it("fait primer le statut sur la date : un tournoi commencé reste « En cours »", () => {
    expect(tournamentCountdownLabel("ONGOING", -3)).toBe("En cours");
    expect(tournamentCountdownLabel("ONGOING", 0)).toBe("En cours");
  });
  it("« Terminé » vient du statut, pas de l'ancienneté de la date de début", () => {
    expect(tournamentCountdownLabel("FINISHED", -30)).toBe("Terminé");
  });
  it("un tournoi à venir garde le compte à rebours", () => {
    expect(tournamentCountdownLabel("UPCOMING", 5)).toBe("Dans 5 j");
    expect(tournamentCountdownLabel("UPCOMING", 0)).toBe("Aujourd'hui");
    expect(tournamentCountdownLabel("UPCOMING", null)).toBe("Date à définir");
  });
});

describe("monthKey / monthLabel", () => {
  it("clé stable par mois", () => {
    expect(monthKey(new Date("2026-07-25T12:00:00"))).toBe("2026-07");
    expect(monthKey(null)).toBe("0000-00");
  });
  it("libellé capitalisé", () => {
    expect(monthLabel(new Date("2026-07-25T12:00:00"))).toBe("Juillet 2026");
    expect(monthLabel(null)).toBe("Dates à définir");
  });

  // Ces deux cas passaient dans n'importe quel fuseau : les dates d'essai
  // étaient écrites sans suffixe, donc interprétées en heure locale. Un instant
  // en UTC proche de minuit est le seul qui distingue vraiment Paris d'UTC —
  // le 31 juillet à 22h30 UTC, il est déjà le 1er août à Paris.
  it("range un tournoi sur le mois de Paris, pas sur celui d'UTC", () => {
    const veilleEnUtc = new Date("2026-07-31T22:30:00Z");
    expect(monthKey(veilleEnUtc)).toBe("2026-08");
    expect(monthLabel(veilleEnUtc)).toBe("Août 2026");
  });
});

describe("dayKey", () => {
  // Instants notés en UTC, attentes exprimées en jour de PARIS : c'est ce
  // jour-là que le lecteur français voit. Le fixture précédent
  // (« 2026-07-25T23:59:00 », sans fuseau) était interprété dans le fuseau du
  // process : il donnait un résultat sur une machine en heure de Paris et un
  // autre sur le runner d'intégration en UTC.
  it("groupe sur le jour de Paris", () => {
    expect(dayKey(new Date("2026-07-25T21:59:00Z"))).toBe("2026-07-25");
    expect(dayKey(null)).toBe("no-date");
  });

  it("range un match de fin de soirée au bon jour", () => {
    // 22h30 UTC en juillet, c'est déjà 00h30 le lendemain à Paris : le match
    // appartient au 26, pas au 25.
    expect(dayKey(new Date("2026-07-25T22:30:00Z"))).toBe("2026-07-26");
  });

  it("ne dépend pas du fuseau du process", () => {
    // Même instant, deux écritures : la clé doit être identique.
    expect(dayKey(new Date("2026-07-25T18:00:00Z"))).toBe(
      dayKey(new Date(Date.UTC(2026, 6, 25, 18, 0, 0)))
    );
  });
});

describe("fullDate", () => {
  it("rend le jour, le mois et l'année sur deux et quatre chiffres", () => {
    expect(fullDate(new Date("2026-07-27T18:00:00Z"))).toBe("27/07/2026");
    expect(fullDate(new Date("2026-01-05T12:00:00Z"))).toBe("05/01/2026");
  });

  it("marque l'absence de date sans inventer de valeur", () => {
    expect(fullDate(null)).toBe("--/--/----");
  });

  it("rend le jour de Paris, pas celui d'UTC", () => {
    // 22h30 UTC en juillet, c'est déjà le lendemain à Paris : la même erreur
    // de fuseau que celle corrigée sur `dayKey` décalerait la date d'un jour.
    expect(fullDate(new Date("2026-07-25T22:30:00Z"))).toBe("26/07/2026");
  });
});

describe("computeAge", () => {
  it("retourne null sans date de naissance", () => {
    expect(computeAge(null, now)).toBe(null);
  });
  it("compte les années révolues", () => {
    expect(computeAge(new Date("2000-07-25"), now)).toBe(26);
  });
  it("retire un an si l'anniversaire n'est pas passé", () => {
    expect(computeAge(new Date("2000-07-26"), now)).toBe(25);
  });
});

describe("durationShort", () => {
  it("retourne null sans date", () => {
    expect(durationShort(null, now)).toBe(null);
  });
  it("compte en jours sous un mois", () => {
    expect(durationShort(new Date("2026-07-13T12:00:00"), now)).toBe("12j");
  });
  it("compte en mois sous un an", () => {
    expect(durationShort(new Date("2025-11-25T12:00:00"), now)).toBe("8m");
  });
  it("compte en années au-delà", () => {
    expect(durationShort(new Date("2025-07-25T12:00:00"), now)).toBe("1a");
    expect(durationShort(new Date("2023-01-10T12:00:00"), now)).toBe("3a");
  });
});
