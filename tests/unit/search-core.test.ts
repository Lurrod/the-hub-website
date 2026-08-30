import { describe, it, expect } from "vitest";
import { capSearchQuery, MAX_SEARCH_LENGTH } from "@/lib/search-core";

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
