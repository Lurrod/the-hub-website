import { describe, it, expect } from "vitest";
import { flashCodeFromError } from "@/lib/form-errors";
import { ZodError } from "zod";
import { lengthLabel } from "@/lib/duration";
import { roleIconUrl, roleLabel } from "@/lib/roles";

function zodIssue(field: string): ZodError {
  return new ZodError([
    { code: "custom", path: ["socials", field], message: "invalide" },
  ]);
}

describe("flashCodeFromError", () => {
  it("distingue les réseaux dont le domaine est imposé", () => {
    expect(flashCodeFromError(zodIssue("twitter"))).toBe("twitter");
    expect(flashCodeFromError(zodIssue("twitch"))).toBe("twitch");
  });

  it("reconnaît un score de série hors bornes", () => {
    expect(flashCodeFromError(zodIssue("scoreA"))).toBe("score");
    expect(flashCodeFromError(zodIssue("scoreB"))).toBe("score");
  });

  it("retombe sur « invalid » pour tout le reste", () => {
    expect(flashCodeFromError(zodIssue("name"))).toBe("invalid");
    expect(flashCodeFromError(new Error("boom"))).toBe("invalid");
    expect(flashCodeFromError(null)).toBe("invalid");
  });
});

describe("roles Valorant", () => {
  it("donne le libellé et l'icône d'un rôle connu", () => {
    expect(roleLabel("DUELIST")).toBe("Duelliste");
    expect(roleIconUrl("SENTINEL")).toMatch(/^https:\/\/media\.valorant-api\.com\//);
  });

  it("rend undefined sur un rôle absent ou inconnu", () => {
    for (const v of [null, undefined, "", "INCONNU"]) {
      expect(roleLabel(v)).toBeUndefined();
      expect(roleIconUrl(v)).toBeUndefined();
    }
  });
});

describe("lengthLabel", () => {
  const d = (s: string) => new Date(`${s}T00:00:00Z`);

  it("rend un tiret sans date de début", () => {
    expect(lengthLabel(null, null)).toBe("-");
  });

  it("compte en jours sous un mois", () => {
    expect(lengthLabel(d("2026-01-01"), d("2026-01-15"))).toBe("14j");
  });

  it("passe en mois au-delà de trente jours", () => {
    expect(lengthLabel(d("2026-01-01"), d("2026-04-01"))).toBe("3m");
  });

  it("passe en années au-delà de douze mois", () => {
    expect(lengthLabel(d("2023-01-01"), d("2026-01-01"))).toBe("3a");
    expect(lengthLabel(d("2023-01-01"), d("2026-04-01"))).toBe("3a 3m");
  });

  it("une fin absente signifie « jusqu'à maintenant »", () => {
    expect(lengthLabel(d("2026-08-01"), null)).toMatch(/^\d+j$/);
  });
});
