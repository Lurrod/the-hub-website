import { describe, it, expect } from "vitest";
import {
  finishedCutoff,
  hasTournamentStarted,
  isRegistrationOpen,
  isTournamentOver,
  nextTournamentStatus,
  shouldSync,
  SYNC_INTERVAL_MS,
} from "@/lib/tournament-status";

const NOW = new Date("2026-08-03T14:30:00.000Z");

describe("finishedCutoff", () => {
  it("renvoie minuit UTC du jour courant", () => {
    expect(finishedCutoff(NOW).toISOString()).toBe("2026-08-03T00:00:00.000Z");
  });
});

describe("isTournamentOver", () => {
  it("est faux sans date de fin", () => {
    expect(isTournamentOver({ endDate: null }, NOW)).toBe(false);
  });

  it("est faux quand la date de fin est dans le futur", () => {
    expect(isTournamentOver({ endDate: new Date("2026-08-10T00:00:00.000Z") }, NOW)).toBe(false);
  });

  it("est faux le jour même de la fin", () => {
    expect(isTournamentOver({ endDate: new Date("2026-08-03T00:00:00.000Z") }, NOW)).toBe(false);
  });

  it("est vrai dès le lendemain de la date de fin", () => {
    expect(isTournamentOver({ endDate: new Date("2026-08-02T00:00:00.000Z") }, NOW)).toBe(true);
  });

  it("est vrai pour une date de fin largement dépassée", () => {
    expect(isTournamentOver({ endDate: new Date("2025-01-01T00:00:00.000Z") }, NOW)).toBe(true);
  });
});

describe("hasTournamentStarted", () => {
  it("est faux sans date de début", () => {
    expect(hasTournamentStarted({ startDate: null }, NOW)).toBe(false);
  });

  it("est faux quand le début est dans le futur", () => {
    expect(hasTournamentStarted({ startDate: new Date("2026-08-10T00:00:00.000Z") }, NOW)).toBe(
      false
    );
  });

  it("est vrai le jour même du début", () => {
    expect(hasTournamentStarted({ startDate: new Date("2026-08-03T00:00:00.000Z") }, NOW)).toBe(
      true
    );
  });

  it("est vrai après le début", () => {
    expect(hasTournamentStarted({ startDate: new Date("2026-07-01T00:00:00.000Z") }, NOW)).toBe(
      true
    );
  });
});

describe("isRegistrationOpen", () => {
  const open = { status: "UPCOMING" as const, startDate: null, endDate: null };

  it("est ouverte sur un tournoi à venir sans dates", () => {
    expect(isRegistrationOpen(open, NOW)).toBe(true);
  });

  it("est ouverte avant la date de début", () => {
    expect(
      isRegistrationOpen({ ...open, startDate: new Date("2026-09-01T00:00:00.000Z") }, NOW)
    ).toBe(true);
  });

  it("se ferme dès le jour du coup d'envoi, même si le statut est resté « À venir »", () => {
    expect(
      isRegistrationOpen({ ...open, startDate: new Date("2026-08-03T00:00:00.000Z") }, NOW)
    ).toBe(false);
  });

  it("se ferme quand la date de fin est dépassée", () => {
    expect(
      isRegistrationOpen({ ...open, endDate: new Date("2026-08-01T00:00:00.000Z") }, NOW)
    ).toBe(false);
  });

  it("se ferme sur un tournoi en cours ou terminé", () => {
    expect(isRegistrationOpen({ ...open, status: "ONGOING" }, NOW)).toBe(false);
    expect(isRegistrationOpen({ ...open, status: "FINISHED" }, NOW)).toBe(false);
  });
});

describe("nextTournamentStatus", () => {
  it("passe à FINISHED après la date de fin", () => {
    expect(
      nextTournamentStatus(
        { status: "ONGOING", startDate: null, endDate: new Date("2026-08-01T00:00:00.000Z") },
        NOW
      )
    ).toBe("FINISHED");
  });

  it("passe de À venir à En cours au coup d'envoi", () => {
    expect(
      nextTournamentStatus(
        { status: "UPCOMING", startDate: new Date("2026-08-03T00:00:00.000Z"), endDate: null },
        NOW
      )
    ).toBe("ONGOING");
  });

  it("ne touche pas un tournoi qui n'a pas encore commencé", () => {
    expect(
      nextTournamentStatus(
        { status: "UPCOMING", startDate: new Date("2026-09-01T00:00:00.000Z"), endDate: null },
        NOW
      )
    ).toBe("UPCOMING");
  });

  it("ne rouvre jamais un tournoi terminé manuellement", () => {
    expect(nextTournamentStatus({ status: "FINISHED", startDate: null, endDate: null }, NOW)).toBe(
      "FINISHED"
    );
  });
});

describe("shouldSync", () => {
  it("synchronise au tout premier appel", () => {
    expect(shouldSync(0, 1_000_000, SYNC_INTERVAL_MS)).toBe(true);
  });

  it("ne resynchronise pas dans l'intervalle", () => {
    expect(shouldSync(1_000_000, 1_000_000 + SYNC_INTERVAL_MS - 1, SYNC_INTERVAL_MS)).toBe(false);
  });

  it("resynchronise une fois l'intervalle écoulé", () => {
    expect(shouldSync(1_000_000, 1_000_000 + SYNC_INTERVAL_MS, SYNC_INTERVAL_MS)).toBe(true);
  });
});
