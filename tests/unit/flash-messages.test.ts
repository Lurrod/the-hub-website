import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { ERROR_MESSAGES, OK_MESSAGES, resolveFlash } from "@/lib/flash-messages";

describe("resolveFlash", () => {
  it("rend le message de succès correspondant", () => {
    const f = resolveFlash("team-saved", null);
    expect(f?.kind).toBe("success");
    expect(f?.title).toBe(OK_MESSAGES["team-saved"].title);
  });

  it("rend le message d'erreur correspondant", () => {
    const f = resolveFlash(null, "lastowner");
    expect(f?.kind).toBe("error");
    expect(f?.message).toBe(ERROR_MESSAGES.lastowner.message);
  });

  it("retombe sur un message générique pour un code inconnu", () => {
    expect(resolveFlash("code-inexistant", null)?.kind).toBe("success");
    expect(resolveFlash(null, "code-inexistant")?.title).toBe("Erreur");
  });

  it("rend null sans code", () => {
    expect(resolveFlash(null, null)).toBeNull();
  });

  it("donne la priorité au succès quand les deux sont présents", () => {
    expect(resolveFlash("team-saved", "invalid")?.kind).toBe("success");
  });
});

/** Tous les fichiers .ts/.tsx sous src/. */
function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

describe("couverture des codes de retour", () => {
  const sources = sourceFiles(path.join(process.cwd(), "src"))
    .map((f) => readFileSync(f, "utf8"))
    .join("\n");

  /**
   * Codes littéraux passés en `?ok=` / `?error=` dans les redirections.
   *
   * La négation finale écarte les codes construits par interpolation
   * (`?error=team${conflict}taken`) : le préfixe seul n'est pas un code, et
   * le scanner n'a aucun moyen de deviner la valeur injectée. Ces cas-là sont
   * vérifiés à la main juste en dessous.
   */
  function usedCodes(param: "ok" | "error"): string[] {
    const re = new RegExp(`[?&]${param}=([a-z][a-z0-9-]*)(?![a-z0-9-$])`, "g");
    return [...new Set([...sources.matchAll(re)].map((m) => m[1]))];
  }

  it("couvre les codes assemblés dynamiquement", () => {
    // `?error=team${conflict}taken`, avec conflict ∈ {name, tag}.
    for (const code of ["teamnametaken", "teamtagtaken"]) {
      expect(ERROR_MESSAGES).toHaveProperty(code);
    }
    // `?error=${flashCodeFromError(e)}` et `?error=${riotFlashCode(e)}`.
    for (const code of ["invalid", "twitter", "twitch", "score"]) {
      expect(ERROR_MESSAGES).toHaveProperty(code);
    }
    for (const code of ["riotformat", "riotnotfound", "riottaken", "ratelimited", "riotapi"]) {
      expect(ERROR_MESSAGES).toHaveProperty(code);
    }
  });

  it("chaque code de succès émis a un message", () => {
    // Un code oublié n'échoue nulle part : l'utilisateur voit juste
    // « Opération réussie », sans indication de ce qui s'est passé.
    const missing = usedCodes("ok").filter((c) => !(c in OK_MESSAGES));
    expect(missing).toEqual([]);
  });

  it("chaque code d'erreur émis a un message", () => {
    const missing = usedCodes("error").filter((c) => !(c in ERROR_MESSAGES));
    expect(missing).toEqual([]);
  });

  it("les tables de messages ne sont pas vides", () => {
    expect(Object.keys(OK_MESSAGES).length).toBeGreaterThan(10);
    expect(Object.keys(ERROR_MESSAGES).length).toBeGreaterThan(10);
  });
});
