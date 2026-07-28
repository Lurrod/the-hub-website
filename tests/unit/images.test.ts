import { describe, it, expect } from "vitest";
import { validateImageUpload, imageKeyFor, resolveUploadPath } from "@/lib/images";

describe("validateImageUpload", () => {
  it("accepte un png sous la limite", () => {
    expect(validateImageUpload({ type: "image/png", size: 1000 }).ok).toBe(true);
  });
  it("refuse un type non autorisé", () => {
    const r = validateImageUpload({ type: "image/gif", size: 1000 });
    expect(r.ok).toBe(false);
  });
  it("refuse au-dessus de la limite", () => {
    const r = validateImageUpload({ type: "image/png", size: 10 * 1024 * 1024 });
    expect(r.ok).toBe(false);
  });
});

describe("imageKeyFor", () => {
  it("produit une clé /api/images/<cat>/<id>.webp", () => {
    expect(imageKeyFor("teams", "abc123")).toBe("/api/images/teams/abc123.webp");
  });
});

describe("resolveUploadPath", () => {
  it("résout un chemin sûr dans uploads/", () => {
    const p = resolveUploadPath(["teams", "abc123.webp"]);
    expect(p).toContain("uploads");
    expect(p.endsWith("abc123.webp")).toBe(true);
  });
  it("rejette la traversée de répertoire", () => {
    expect(() => resolveUploadPath(["..", "..", "etc", "passwd"])).toThrow();
  });
  it("rejette une catégorie inconnue", () => {
    expect(() => resolveUploadPath(["secrets", "x.webp"])).toThrow();
  });
});

describe("imageKeyFor (tournaments + bannière)", () => {
  it("produit une clé logo pour tournaments", () => {
    expect(imageKeyFor("tournaments", "t1")).toBe("/api/images/tournaments/t1.webp");
  });
  it("produit une clé bannière avec le suffixe -banner", () => {
    expect(imageKeyFor("tournaments", "t1", "banner")).toBe(
      "/api/images/tournaments/t1-banner.webp"
    );
  });
});

describe("resolveUploadPath (tournaments)", () => {
  it("résout un chemin sûr pour la catégorie tournaments", () => {
    const p = resolveUploadPath(["tournaments", "t1-banner.webp"]);
    expect(p).toContain("uploads");
    expect(p.endsWith("t1-banner.webp")).toBe(true);
  });
});
