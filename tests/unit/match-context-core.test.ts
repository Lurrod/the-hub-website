import { describe, it, expect } from "vitest";
import { cutoffWhere } from "@/lib/match-context-core";

const BEFORE = new Date("2026-11-02T18:00:00.000Z");

describe("cutoffWhere", () => {
  it("écarte toujours le match affiché", () => {
    expect(cutoffWhere({ before: null, excludeMatchId: "m1" })).toEqual({
      id: { not: "m1" },
    });
  });

  it("borne sur la date quand le match affiché en a une", () => {
    expect(cutoffWhere({ before: BEFORE, excludeMatchId: "m1" })).toEqual({
      id: { not: "m1" },
      date: { lt: BEFORE },
    });
  });

  it("ne pose aucune borne de date quand le match affiché n'en a pas", () => {
    expect(cutoffWhere({ before: null, excludeMatchId: "m1" }).date).toBeUndefined();
  });
});
