import { describe, it, expect } from "vitest";
import { polarPoint, ringSlicePath, donutSlices } from "@/lib/donut-core";

describe("polarPoint", () => {
  it("place l'angle zéro à midi, sens horaire", () => {
    const top = polarPoint(100, 0, 50);
    expect(top.x).toBeCloseTo(100);
    expect(top.y).toBeCloseTo(50);
    const right = polarPoint(100, Math.PI / 2, 50);
    expect(right.x).toBeCloseTo(150);
    expect(right.y).toBeCloseTo(100);
  });
});

describe("ringSlicePath", () => {
  it("trace une part d'anneau fermée entre deux rayons", () => {
    const d = ringSlicePath(130, 118, 76, 0, Math.PI / 2);
    expect(d.startsWith("M")).toBe(true);
    expect(d).toContain("A118,118");
    expect(d).toContain("A76,76");
    expect(d.endsWith("Z")).toBe(true);
  });
});

describe("donutSlices", () => {
  it("répartit les angles au prorata des valeurs, espace déduit", () => {
    const [a, b] = donutSlices([3, 1], 2, 97);
    // 3/4 et 1/4 du tour, moins un demi-espace de chaque côté.
    const gap = 2 / 97;
    expect(a.from).toBeCloseTo(gap / 2);
    expect(a.to).toBeCloseTo(Math.PI * 1.5 - gap / 2);
    expect(b.to).toBeCloseTo(Math.PI * 2 - gap / 2);
    expect(a.mid).toBeCloseTo(Math.PI * 0.75);
  });

  it("une part unique fait le tour complet, sans encoche", () => {
    const [only] = donutSlices([5], 2, 97);
    expect(only.from).toBe(0);
    expect(only.to).toBeCloseTo(Math.PI * 2);
  });

  it("ignore les valeurs nulles sans décaler les autres", () => {
    const slices = donutSlices([2, 0, 2], 0, 97);
    expect(slices).toHaveLength(3);
    expect(slices[1].from).toBeCloseTo(slices[1].to);
    expect(slices[2].to).toBeCloseTo(Math.PI * 2);
  });
});
