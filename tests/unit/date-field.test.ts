import { describe, it, expect } from "vitest";
import {
  toFrDate,
  toFrDateTime,
  fromFrDate,
  fromFrDateTime,
  monthCells,
  monthTitle,
  shiftMonth,
  initialMonth,
  todayIso,
  timePart,
  joinDateTime,
} from "@/lib/date-field";

describe("toFrDate", () => {
  it("retourne la date au format français", () => {
    expect(toFrDate("2026-08-13")).toBe("13/08/2026");
    expect(toFrDate("2026-01-01")).toBe("01/01/2026");
  });
  it("ignore une partie heure", () => {
    expect(toFrDate("2026-08-13T20:30")).toBe("13/08/2026");
  });
  it("rend une chaîne vide sur une valeur vide ou illisible", () => {
    expect(toFrDate("")).toBe("");
    expect(toFrDate("n'importe quoi")).toBe("");
  });
});

describe("toFrDateTime", () => {
  it("joint la date et l'heure", () => {
    expect(toFrDateTime("2026-08-13T20:30")).toBe("13/08/2026 20:30");
  });
  it("se contente de la date quand l'heure manque", () => {
    expect(toFrDateTime("2026-08-13")).toBe("13/08/2026");
  });
  it("rend une chaîne vide sur une valeur vide", () => {
    expect(toFrDateTime("")).toBe("");
  });
});

describe("fromFrDate", () => {
  it("lit une date complète", () => {
    expect(fromFrDate("13/08/2026")).toBe("2026-08-13");
  });
  it("accepte les séparateurs usuels et les chiffres seuls", () => {
    expect(fromFrDate("13-08-2026")).toBe("2026-08-13");
    expect(fromFrDate("13.08.2026")).toBe("2026-08-13");
    expect(fromFrDate("13 08 2026")).toBe("2026-08-13");
    expect(fromFrDate("13082026")).toBe("2026-08-13");
  });
  it("complète un jour ou un mois écrit sur un chiffre", () => {
    expect(fromFrDate("1/8/2026")).toBe("2026-08-01");
  });
  it("complète une année sur deux chiffres dans le siècle courant", () => {
    expect(fromFrDate("13/08/26")).toBe("2026-08-13");
  });
  it("tolère les espaces autour", () => {
    expect(fromFrDate("  13/08/2026  ")).toBe("2026-08-13");
  });
  it("refuse un jour qui n'existe pas", () => {
    expect(fromFrDate("31/02/2026")).toBe(null);
    expect(fromFrDate("00/08/2026")).toBe(null);
    expect(fromFrDate("13/13/2026")).toBe(null);
  });
  it("accepte le 29 février d'une année bissextile", () => {
    expect(fromFrDate("29/02/2028")).toBe("2028-02-29");
    expect(fromFrDate("29/02/2026")).toBe(null);
  });
  it("refuse une saisie incomplète ou vide", () => {
    expect(fromFrDate("")).toBe(null);
    expect(fromFrDate("13/08")).toBe(null);
    expect(fromFrDate("abc")).toBe(null);
  });
});

describe("fromFrDateTime", () => {
  it("lit une date et une heure", () => {
    expect(fromFrDateTime("13/08/2026 20:30")).toBe("2026-08-13T20:30");
  });
  it("accepte le h comme séparateur d'heure", () => {
    expect(fromFrDateTime("13/08/2026 20h30")).toBe("2026-08-13T20:30");
  });
  it("suppose minuit quand l'heure manque", () => {
    expect(fromFrDateTime("13/08/2026")).toBe("2026-08-13T00:00");
  });
  it("refuse une heure impossible", () => {
    expect(fromFrDateTime("13/08/2026 25:00")).toBe(null);
    expect(fromFrDateTime("13/08/2026 20:70")).toBe(null);
  });
  it("refuse une date illisible", () => {
    expect(fromFrDateTime("hier soir")).toBe(null);
    expect(fromFrDateTime("")).toBe(null);
  });
});

describe("monthCells", () => {
  const cells = monthCells(2026, 8);

  it("rend six semaines pleines", () => {
    expect(cells).toHaveLength(42);
  });
  it("commence un lundi", () => {
    // Le 1er août 2026 est un samedi : la grille ouvre sur le lundi 27 juillet.
    expect(cells[0].iso).toBe("2026-07-27");
    expect(cells[0].currentMonth).toBe(false);
  });
  it("marque les jours du mois affiché", () => {
    const inMonth = cells.filter((c) => c.currentMonth);
    expect(inMonth).toHaveLength(31);
    expect(inMonth[0].iso).toBe("2026-08-01");
    expect(inMonth[30].iso).toBe("2026-08-31");
  });
  it("enchaîne les jours sans trou", () => {
    expect(cells[41].iso).toBe("2026-09-06");
  });
  it("gère un mois qui commence un lundi sans semaine vide en tête", () => {
    const juin = monthCells(2026, 6);
    expect(juin[0].iso).toBe("2026-06-01");
    expect(juin[0].currentMonth).toBe(true);
  });
  it("gère février d'une année bissextile", () => {
    expect(monthCells(2028, 2).filter((c) => c.currentMonth)).toHaveLength(29);
  });
});

describe("monthTitle", () => {
  it("nomme le mois et l'année", () => {
    expect(monthTitle(2026, 8)).toBe("août 2026");
    expect(monthTitle(2026, 1)).toBe("janvier 2026");
  });
});

describe("shiftMonth", () => {
  it("avance et recule d'un mois", () => {
    expect(shiftMonth({ year: 2026, month: 8 }, 1)).toEqual({ year: 2026, month: 9 });
    expect(shiftMonth({ year: 2026, month: 8 }, -1)).toEqual({ year: 2026, month: 7 });
  });
  it("change d'année aux bornes", () => {
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
  });
  it("saute plusieurs mois", () => {
    expect(shiftMonth({ year: 2026, month: 8 }, 12)).toEqual({ year: 2027, month: 8 });
  });
});

describe("initialMonth", () => {
  it("ouvre sur le mois de la valeur saisie", () => {
    expect(initialMonth("2024-03-09", "2026-08-13")).toEqual({ year: 2024, month: 3 });
  });
  it("ouvre sur le mois courant quand rien n'est saisi", () => {
    expect(initialMonth("", "2026-08-13")).toEqual({ year: 2026, month: 8 });
  });
  it("ignore une valeur illisible", () => {
    expect(initialMonth("plus tard", "2026-08-13")).toEqual({ year: 2026, month: 8 });
  });
});

describe("todayIso", () => {
  it("rend le jour local, sans décalage de fuseau", () => {
    // 23h30 heure locale : un passage par UTC ferait basculer au lendemain.
    expect(todayIso(new Date(2026, 7, 13, 23, 30))).toBe("2026-08-13");
  });
});

describe("timePart", () => {
  it("extrait l'heure d'une valeur datetime", () => {
    expect(timePart("2026-08-13T20:30")).toBe("20:30");
  });
  it("rend une chaîne vide sans partie heure", () => {
    expect(timePart("2026-08-13")).toBe("");
    expect(timePart("")).toBe("");
  });
});

describe("joinDateTime", () => {
  it("assemble une date et une heure", () => {
    expect(joinDateTime("2026-08-13", "20:30")).toBe("2026-08-13T20:30");
  });
  it("suppose minuit sans heure", () => {
    expect(joinDateTime("2026-08-13", "")).toBe("2026-08-13T00:00");
  });
  it("ne rend rien sans date", () => {
    expect(joinDateTime("", "20:30")).toBe("");
  });
});
