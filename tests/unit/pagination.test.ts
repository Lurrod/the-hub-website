import { describe, it, expect } from "vitest";
import {
  clampPage,
  pageCount,
  pageHref,
  pageOffset,
  pageRange,
  parsePage,
} from "@/lib/pagination";

describe("parsePage", () => {
  it("lit un numéro de page valide", () => expect(parsePage("3")).toBe(3));
  it("ramène à 1 toute valeur invalide", () => {
    for (const raw of [undefined, "", "0", "-2", "1.5", "abc", "1e3"]) {
      expect(parsePage(raw)).toBe(1);
    }
  });
});

describe("pageCount", () => {
  it("arrondit au supérieur", () => expect(pageCount(47, 10)).toBe(5));
  it("rend une page même sans élément", () => expect(pageCount(0, 10)).toBe(1));
  it("compte juste sur un multiple exact", () => expect(pageCount(20, 10)).toBe(2));
  it("se protège d'une taille de page nulle", () => expect(pageCount(10, 0)).toBe(1));
});

describe("pageOffset", () => {
  it("décale de la bonne quantité", () => expect(pageOffset(3, 10)).toBe(20));
  it("ne descend jamais sous zéro", () => expect(pageOffset(-5, 10)).toBe(0));
});

describe("pageRange", () => {
  it("donne le rang affiché", () => expect(pageRange(2, 10, 47)).toEqual({ from: 11, to: 20 }));
  it("tronque la dernière page", () => expect(pageRange(5, 10, 47)).toEqual({ from: 41, to: 47 }));
  it("rend null sans élément", () => expect(pageRange(1, 10, 0)).toBeNull());
  it("rend null au-delà de la dernière page", () => expect(pageRange(9, 10, 47)).toBeNull());
});

describe("pageHref", () => {
  it("garde la page 1 canonique, sans paramètre", () => {
    expect(pageHref("/matchs", {}, 1)).toBe("/matchs");
  });

  it("conserve les filtres en changeant de page", () => {
    expect(pageHref("/matchs", { f: "finished" }, 3)).toBe("/matchs?f=finished&p=3");
  });

  it("ignore les paramètres vides ou absents", () => {
    expect(pageHref("/lft", { role: undefined, country: "", q: "aim" }, 2)).toBe("/lft?q=aim&p=2");
  });

  it("échappe les valeurs", () => {
    expect(pageHref("/lft", { q: "a b&c" }, 1)).toBe("/lft?q=a+b%26c");
  });
});

describe("clampPage", () => {
  it("laisse passer une page valide", () => expect(clampPage(2, 47, 10)).toBe(2));
  it("ramène à la dernière page au-delà des bornes", () => expect(clampPage(99, 47, 10)).toBe(5));
  it("remonte à 1 sous les bornes", () => expect(clampPage(0, 47, 10)).toBe(1));
  it("reste sur 1 quand la liste est vide", () => expect(clampPage(3, 0, 10)).toBe(1));
});
