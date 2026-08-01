import { describe, it, expect } from "vitest";
import { buildCsp, CSP_HEADER, EXTERNAL_IMAGE_HOSTS } from "@/lib/csp";

/** Découpe la policy en `{ directive: [valeurs] }` pour pouvoir l'interroger. */
function parse(policy: string): Record<string, string[]> {
  return Object.fromEntries(
    policy
      .split(";")
      .map((d) => d.trim())
      .filter(Boolean)
      .map((d) => {
        const [name, ...values] = d.split(/\s+/);
        return [name, values];
      })
  );
}

describe("buildCsp", () => {
  it("place le nonce fourni dans script-src", () => {
    const d = parse(buildCsp("abc123", false));
    expect(d["script-src"]).toContain("'nonce-abc123'");
  });

  it("verrouille les fondamentaux", () => {
    const d = parse(buildCsp("n", false));
    expect(d["default-src"]).toEqual(["'self'"]);
    expect(d["object-src"]).toEqual(["'none'"]);
    expect(d["frame-ancestors"]).toEqual(["'none'"]);
    expect(d["base-uri"]).toEqual(["'self'"]);
    expect(d["form-action"]).toEqual(["'self'"]);
  });

  it("autorise les hôtes d'images réellement utilisés par le site", () => {
    const d = parse(buildCsp("n", false));
    // Drapeaux (flag.tsx) et icônes d'agents (lib/agents.ts).
    for (const host of EXTERNAL_IMAGE_HOSTS) {
      expect(d["img-src"]).toContain(host);
    }
  });

  it("autorise blob: et data: pour les aperçus d'upload et le grain SVG", () => {
    // image-upload/image-cropper créent des URL blob:, et globals.css charge un
    // bruit SVG en data:. Sans ces schémas, l'aperçu de recadrage casse.
    const d = parse(buildCsp("n", false));
    expect(d["img-src"]).toContain("blob:");
    expect(d["img-src"]).toContain("data:");
  });

  it("tolère les attributs style inline sans ouvrir les balises <style>", () => {
    // 18 occurrences de style={{…}} dans src/ : elles relèvent de
    // style-src-attr, qu'on assouplit seul plutôt que style-src en entier.
    const d = parse(buildCsp("n", false));
    expect(d["style-src-attr"]).toContain("'unsafe-inline'");
    expect(d["style-src"]).not.toContain("'unsafe-inline'");
  });

  it("n'autorise 'unsafe-eval' qu'en développement", () => {
    // React s'appuie sur eval en dev pour reconstruire les piles d'erreurs.
    expect(parse(buildCsp("n", true))["script-src"]).toContain("'unsafe-eval'");
    expect(parse(buildCsp("n", false))["script-src"]).not.toContain("'unsafe-eval'");
  });

  it("tient sur une seule ligne, sans espaces superflus", () => {
    const policy = buildCsp("n", false);
    expect(policy).not.toMatch(/\n/);
    expect(policy).not.toMatch(/\s{2,}/);
  });

  it("est publiée en Report-Only tant que la CSP n'est pas éprouvée", () => {
    // Report-Only observe sans jamais bloquer : basculer sur
    // "Content-Security-Policy" est un choix explicite, pas un effet de bord.
    expect(CSP_HEADER).toBe("Content-Security-Policy-Report-Only");
  });
});
