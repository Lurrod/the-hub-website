import { describe, it, expect } from "vitest";
import { formatLogLine, describeError } from "@/lib/logger";

const T = new Date("2026-08-01T12:00:00.000Z");

describe("formatLogLine", () => {
  it("produit une ligne JSON avec niveau, horodatage et évènement", () => {
    const line = JSON.parse(formatLogLine("error", "riot.verify.failed", undefined, T));
    expect(line).toEqual({
      level: "error",
      time: "2026-08-01T12:00:00.000Z",
      event: "riot.verify.failed",
    });
  });

  it("fusionne le contexte à plat, pour être filtrable en une passe", () => {
    const line = JSON.parse(
      formatLogLine("info", "match.stats.fetched", { matchId: "m1", maps: 3 }, T)
    );
    expect(line.matchId).toBe("m1");
    expect(line.maps).toBe(3);
  });

  it("écarte les clés indéfinies mais conserve null et false", () => {
    const line = JSON.parse(
      formatLogLine("warn", "e", { absent: undefined, vide: null, faux: false }, T)
    );
    expect("absent" in line).toBe(false);
    expect(line.vide).toBeNull();
    expect(line.faux).toBe(false);
  });

  it("tient sur une seule ligne, condition d'un log exploitable", () => {
    const line = formatLogLine("info", "e", { texte: "avec\nun saut" }, T);
    expect(line.split("\n")).toHaveLength(1);
  });
});

describe("describeError", () => {
  it("extrait nom et message d'une Error", () => {
    const c = describeError(new TypeError("cassé"));
    expect(c.errorName).toBe("TypeError");
    expect(c.errorMessage).toBe("cassé");
  });

  it("remonte le code des erreurs qui en portent un (RiotIdError, Prisma)", () => {
    const e = Object.assign(new Error("RATE_LIMITED"), { code: "RATE_LIMITED" });
    expect(describeError(e).errorCode).toBe("RATE_LIMITED");
  });

  it("ne casse pas sur une valeur lancée qui n'est pas une Error", () => {
    expect(describeError("boum")).toEqual({ errorName: "string", errorMessage: "boum" });
    expect(() => describeError(null)).not.toThrow();
  });
});
