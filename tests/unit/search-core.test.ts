import { describe, it, expect } from "vitest";
import { MAX_SEARCH_LENGTH, capSearchQuery, escapeLikeWildcards } from "@/lib/search-core";

describe("capSearchQuery", () => {
  it("trims surrounding whitespace", () => {
    expect(capSearchQuery("  fnatic  ")).toBe("fnatic");
  });

  it("returns empty string for nullish or blank input", () => {
    expect(capSearchQuery(null)).toBe("");
    expect(capSearchQuery(undefined)).toBe("");
    expect(capSearchQuery("   ")).toBe("");
  });

  it("caps length to MAX_SEARCH_LENGTH", () => {
    const long = "a".repeat(MAX_SEARCH_LENGTH + 500);
    expect(capSearchQuery(long)).toHaveLength(MAX_SEARCH_LENGTH);
  });

  it("leaves a short query untouched", () => {
    expect(capSearchQuery("Karmine Corp")).toBe("Karmine Corp");
  });
});

// Aucune injection n'etait possible (parametres lies), mais % et _ restaient
// interpretes par PostgreSQL : une recherche sur « % » renvoyait l'annuaire

// Aucune injection n'était possible (les valeurs passent en paramètres liés),
// mais % et _ restaient interprétés par PostgreSQL : une recherche sur « % »
// renvoyait l'annuaire entier au lieu d'un résultat vide, en forçant un
// parcours séquentiel de la table.
describe("escapeLikeWildcards", () => {
  // Écrit par concaténation et non en littéral échappé : à ce niveau
  // d'empilement d'antislashs, un littéral n'est plus relisible.
  const BS = String.fromCharCode(92);

  it("neutralise le pourcent et le tiret bas", () => {
    expect(escapeLikeWildcards("%")).toBe(BS + "%");
    expect(escapeLikeWildcards("a_b")).toBe("a" + BS + "_b");
  });

  it("échappe la barre oblique inverse, et en premier", () => {
    // En premier, sinon on échapperait les échappements qu'on vient d'écrire.
    expect(escapeLikeWildcards(BS)).toBe(BS + BS);
    expect(escapeLikeWildcards(BS + "%")).toBe(BS + BS + BS + "%");
  });

  it("laisse intact un terme ordinaire", () => {
    expect(escapeLikeWildcards("Ruskof")).toBe("Ruskof");
  });
});
