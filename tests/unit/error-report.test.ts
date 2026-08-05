import { describe, it, expect } from "vitest";
import { buildErrorReport } from "@/lib/error-report";

const REQ = { path: "/tournois/abc", method: "GET" };
const CTX = { routePath: "/tournois/[id]", routeType: "render" };

describe("buildErrorReport", () => {
  it("remonte le digest, seule référence dont dispose l'utilisateur", () => {
    const err = Object.assign(new Error("boom"), { digest: "1234567890" });
    const r = buildErrorReport(err, REQ, CTX);
    expect(r.digest).toBe("1234567890");
    expect(r.errorMessage).toBe("boom");
    expect(r.errorName).toBe("Error");
  });

  it("laisse le digest absent quand l'erreur n'en porte pas", () => {
    expect(buildErrorReport(new Error("nu"), REQ, CTX).digest).toBeUndefined();
  });

  it("localise l'erreur par la route et la méthode", () => {
    const r = buildErrorReport(new Error("x"), REQ, CTX);
    expect(r.path).toBe("/tournois/abc");
    expect(r.method).toBe("GET");
    expect(r.routePath).toBe("/tournois/[id]");
    expect(r.routeType).toBe("render");
  });

  it("ne journalise ni en-têtes ni cookies", () => {
    // Ils portent la session et les valeurs saisies : rien à faire dans un log.
    const r = buildErrorReport(new Error("x"), { ...REQ }, CTX);
    expect(Object.keys(r)).not.toContain("headers");
    expect(JSON.stringify(r)).not.toMatch(/cookie/i);
  });

  it("encaisse une valeur lancée qui n'est pas une Error", () => {
    const r = buildErrorReport("juste une chaîne", REQ, CTX);
    expect(r.errorMessage).toBe("juste une chaîne");
    expect(r.digest).toBeUndefined();
  });
});
